from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import json

from git import Repo
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.repository import Repository, RepositoryFile


SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".jsx": "javascript",
    ".java": "java",
    ".cs": "dotnet",
}


class RepositoryService:
    def __init__(self, db: Session):
        self.db = db

    def import_repository(self, url: str, owner_id: int) -> Repository:
        repo_name = self._repo_name_from_url(url)
        target_root = Path(settings.workspace_dir)
        target_root.mkdir(parents=True, exist_ok=True)
        # Use a timestamped directory to avoid collisions with concurrent imports
        # or leftover locked files from previous operations on Windows.
        import time

        local_path = target_root / f"{repo_name}_{int(time.time())}"
        if local_path.exists():
            # On Windows, files in .git can be read-only or locked; try to make all
            # files writable first, then remove the tree.
            try:
                import stat

                for root, dirs, files in os.walk(local_path, topdown=False):
                    for name in files:
                        path = os.path.join(root, name)
                        try:
                            os.chmod(path, stat.S_IWRITE)
                        except Exception:
                            pass
                    for name in dirs:
                        path = os.path.join(root, name)
                        try:
                            os.chmod(path, stat.S_IWRITE)
                        except Exception:
                            pass
            except Exception:
                pass

            def _on_rm_error(func, path, exc_info):
                try:
                    import stat

                    os.chmod(path, stat.S_IWRITE)
                except Exception:
                    pass
                try:
                    func(path)
                except Exception:
                    pass

            shutil.rmtree(local_path, onerror=_on_rm_error)

        try:
            self._clone_repository(url, local_path)
        except Exception:
            raise

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

        for root, _, files in os.walk(local_path):
            for file_name in files:
                ext = Path(file_name).suffix.lower()
                if ext not in SUPPORTED_EXTENSIONS:
                    continue
                file_path = str(Path(root) / file_name)
                rel = str(Path(file_path).relative_to(local_path)).replace("\\", "/")
                repo_file = RepositoryFile(
                    repository_id=repo.id,
                    file_path=rel,
                    language=SUPPORTED_EXTENSIONS[ext],
                    symbol="",
                )
                self.db.add(repo_file)

        self.db.commit()
        self.db.refresh(repo)
        return repo

    @staticmethod
    def _repo_name_from_url(url: str) -> str:
        parsed = urlparse(url)
        base = parsed.path.rsplit("/", 1)[-1]
        return base.replace(".git", "") or "repository"

    @staticmethod
    def _clone_repository(url: str, local_path: Path) -> None:
        clone_url = url if url.endswith(".git") else f"{url}.git"

        try:
            subprocess.run(["git", "clone", "--depth", "1", clone_url, str(local_path)], check=True, capture_output=True, text=True)
            return
        except subprocess.CalledProcessError as exc:
            last_error = (exc.stderr or exc.stdout or str(exc)).strip()

        if "github.com" in url:
            try:
                RepositoryService._download_github_archive(url, local_path)
                return
            except Exception as archive_exc:
                raise RuntimeError(f"Git clone failed: {last_error}; archive fallback failed: {archive_exc}") from archive_exc

        try:
            subprocess.run(["git", "clone", clone_url, str(local_path)], check=True, capture_output=True, text=True)
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
        files = {p.name for p in local_path.glob("*")}

        language = "unknown"
        framework = "unknown"
        build_system = "unknown"

        if "package.json" in files:
            language = "typescript"
            build_system = "npm"
            framework = "nextjs"
        elif "pyproject.toml" in files or "requirements.txt" in files:
            language = "python"
            build_system = "pip"
            framework = "fastapi"
        elif "pom.xml" in files:
            language = "java"
            build_system = "maven"
            framework = "spring"
        elif "build.gradle" in files:
            language = "java"
            build_system = "gradle"
            framework = "spring"

        return language, framework, build_system
