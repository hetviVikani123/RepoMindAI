from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
import zipfile
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.repository import Repository, RepositoryFile
from app.services.code_parser_service import (
    BINARY_SUFFIXES,
    EXTENSION_TO_LANGUAGE,
    IGNORED_DIRS,
)


class RepositoryService:
    def __init__(self, db: Session):
        self.db = db

    def import_repository(self, url: str, owner_id: int) -> Repository:
        repo_name = self._repo_name_from_url(url)
        target_root = Path(settings.workspace_dir)
        target_root.mkdir(parents=True, exist_ok=True)

        local_path = target_root / f"{repo_name}_{int(time.time())}"

        # If user passed a local folder path directly (e.g. E:/path/to/repo)
        if Path(url).exists() and Path(url).is_dir():
            shutil.copytree(Path(url), local_path, ignore=shutil.ignore_patterns(*IGNORED_DIRS))
        else:
            self._clone_repository(url, local_path)

        language, framework, build_system = self._detect_metadata(local_path)
        repo = Repository(
            owner_id=owner_id,
            name=repo_name,
            url=url,
            local_path=str(local_path),
            language=language,
            framework=framework,
            build_system=build_system,
        )
        self.db.add(repo)
        self.db.flush()

        # Index all project files into repository_files
        self.index_repository_files(repo.id, local_path)

        self.db.commit()
        self.db.refresh(repo)
        return repo

    def index_repository_files(self, repository_id: int, local_path: Path):
        """Discovers and records all repository files into repository_files table."""
        # Clean existing files for this repository if re-indexing
        self.db.query(RepositoryFile).filter(RepositoryFile.repository_id == repository_id).delete()

        for root, dirs, files in os.walk(local_path):
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".git")]

            for file_name in files:
                file_path = Path(root) / file_name
                ext = file_path.suffix.lower()

                if ext in BINARY_SUFFIXES:
                    continue

                rel = str(file_path.relative_to(local_path)).replace("\\", "/")
                parts = rel.split("/")
                if any(p in IGNORED_DIRS for p in parts):
                    continue

                lang = EXTENSION_TO_LANGUAGE.get(ext, "unknown")
                repo_file = RepositoryFile(
                    repository_id=repository_id,
                    file_path=rel,
                    language=lang,
                    symbol="",
                )
                self.db.add(repo_file)

    @staticmethod
    def _repo_name_from_url(url: str) -> str:
        # Check if local path
        if "\\" in url or ("/" in url and not url.startswith("http")):
            name = Path(url).name
            if name:
                return name

        parsed = urlparse(url)
        base = parsed.path.rsplit("/", 1)[-1]
        return base.replace(".git", "") or "repository"

    @staticmethod
    def _clone_repository(url: str, local_path: Path) -> None:
        clone_url = url if url.endswith(".git") else f"{url}.git"

        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", clone_url, str(local_path)],
                check=True,
                capture_output=True,
                text=True,
            )
            return
        except subprocess.CalledProcessError as exc:
            last_error = (exc.stderr or exc.stdout or str(exc)).strip()

        if "github.com" in url:
            try:
                RepositoryService._download_github_archive(url, local_path)
                return
            except Exception as archive_exc:
                raise RuntimeError(
                    f"Git clone failed: {last_error}; archive fallback failed: {archive_exc}"
                ) from archive_exc

        try:
            subprocess.run(
                ["git", "clone", clone_url, str(local_path)],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            raise RuntimeError((exc.stderr or exc.stdout or str(exc)).strip()) from exc

    @staticmethod
    def _download_github_archive(url: str, local_path: Path) -> None:
        parsed = urlparse(url)
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) < 2:
            raise RuntimeError("Invalid GitHub repository URL")

        owner, repo = parts[0], parts[1].replace(".git", "")
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        api_request = Request(api_url, headers={"User-Agent": "RepoMindAI"})
        with urlopen(api_request, timeout=30) as response:
            repo_info = json.loads(response.read().decode("utf-8"))

        default_branch = repo_info.get("default_branch") or "main"
        archive_url = f"https://codeload.github.com/{owner}/{repo}/zip/refs/heads/{default_branch}"
        archive_request = Request(archive_url, headers={"User-Agent": "RepoMindAI"})

        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)
            with urlopen(archive_request, timeout=60) as response:
                shutil.copyfileobj(response, tmp_file)

        try:
            with zipfile.ZipFile(tmp_path) as archive:
                archive.extractall(local_path)

            extracted = next(local_path.iterdir(), None)
            if extracted and extracted.is_dir():
                for child in extracted.iterdir():
                    shutil.move(str(child), str(local_path / child.name))
                shutil.rmtree(extracted, ignore_errors=True)
        finally:
            try:
                tmp_path.unlink(missing_ok=True)
            except Exception:
                pass

    @staticmethod
    def _detect_metadata(local_path: Path) -> tuple[str, str, str]:
        # Tally languages across all files
        lang_counts: Counter[str] = Counter()
        all_text_snippets = []

        root_files = {p.name.lower(): p for p in local_path.iterdir() if p.is_file()}

        for root, dirs, files in os.walk(local_path):
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".git")]
            for f in files:
                ext = Path(f).suffix.lower()
                if ext in EXTENSION_TO_LANGUAGE:
                    lang = EXTENSION_TO_LANGUAGE[ext]
                    if lang not in {"markdown", "config", "text", "json", "yaml", "xml", "toml"}:
                        lang_counts[lang] += 1
                if len(all_text_snippets) < 30 and ext in {".py", ".js", ".ts", ".php", ".java", ".cs", ".go"}:
                    try:
                        snippet = (Path(root) / f).read_text(encoding="utf-8", errors="ignore")[:500]
                        all_text_snippets.append(snippet.lower())
                    except Exception:
                        pass

        # Pick most common programming language
        primary_language = "unknown"
        if lang_counts:
            primary_language = lang_counts.most_common(1)[0][0]

        # Build system and framework detection
        framework = "standard"
        build_system = "none"

        combined_text = " ".join(all_text_snippets)

        if "composer.json" in root_files or primary_language == "php":
            primary_language = "php"
            build_system = "composer"
            framework = "laravel" if "laravel" in combined_text else "php-web"

        elif "package.json" in root_files or primary_language in {"javascript", "typescript"}:
            if primary_language == "unknown":
                primary_language = "typescript" if any(p.suffix in {".ts", ".tsx"} for p in local_path.rglob("*")) else "javascript"
            build_system = "npm"
            if "next" in combined_text or (local_path / "next.config.js").exists() or (local_path / "next.config.ts").exists():
                framework = "nextjs"
            elif "react" in combined_text:
                framework = "react"
            elif "express" in combined_text:
                framework = "express"
            elif "vue" in combined_text:
                framework = "vue"
            else:
                framework = "node"

        elif "requirements.txt" in root_files or "pyproject.toml" in root_files or "setup.py" in root_files or primary_language == "python":
            primary_language = "python"
            build_system = "pip"
            if "streamlit" in combined_text or (local_path / "app.py").exists() and "st." in combined_text:
                framework = "streamlit"
            elif "fastapi" in combined_text:
                framework = "fastapi"
            elif "flask" in combined_text:
                framework = "flask"
            elif "django" in combined_text:
                framework = "django"
            elif "sklearn" in combined_text or "pandas" in combined_text:
                framework = "scikit-learn"
            else:
                framework = "python-app"

        elif "pom.xml" in root_files:
            primary_language = "java"
            build_system = "maven"
            framework = "spring-boot" if "spring" in combined_text else "java-app"

        elif "build.gradle" in root_files:
            primary_language = "java"
            build_system = "gradle"
            framework = "spring-boot" if "spring" in combined_text else "java-app"

        elif any(f.endswith(".csproj") for f in root_files) or primary_language == "csharp":
            primary_language = "csharp"
            build_system = "dotnet"
            framework = "aspnet" if "microsoft.aspnetcore" in combined_text else "dotnet-app"

        elif "go.mod" in root_files or primary_language == "go":
            primary_language = "go"
            build_system = "go-modules"
            framework = "gin" if "gin" in combined_text else "go-app"

        elif "cargo.toml" in root_files or primary_language == "rust":
            primary_language = "rust"
            build_system = "cargo"
            framework = "rust-app"

        return primary_language, framework, build_system
