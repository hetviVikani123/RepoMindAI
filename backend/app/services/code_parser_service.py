from __future__ import annotations

import ast
import os
import re
from pathlib import Path


IGNORED_DIRS = {
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    "vendor",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".next",
    ".turbo",
    "dist",
    "build",
    "out",
    "target",
    "bin",
    "obj",
    ".idea",
    ".vscode",
    "coverage",
    ".gemini",
}

BINARY_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".webp",
    ".svg",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".rar",
    ".pdf",
    ".pptx",
    ".docx",
    ".xlsx",
    ".pkl",
    ".bin",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".mp3",
    ".wav",
    ".avi",
    ".mov",
    ".db",
    ".sqlite",
    ".sqlite3",
    ".pyc",
    ".pyo",
    ".class",
    ".o",
}

EXTENSION_TO_LANGUAGE = {
    ".py": "python",
    ".pyw": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".php": "php",
    ".phtml": "php",
    ".java": "java",
    ".cs": "csharp",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".hxx": "cpp",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".swift": "swift",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".scala": "scala",
    ".dart": "dart",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "css",
    ".sass": "css",
    ".less": "css",
    ".vue": "vue",
    ".svelte": "svelte",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".ps1": "shell",
    ".bat": "shell",
    ".cmd": "shell",
    ".json": "json",
    ".jsonc": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".xml": "xml",
    ".ini": "config",
    ".env": "config",
    ".md": "markdown",
    ".markdown": "markdown",
    ".rst": "markdown",
    ".txt": "text",
}

LAYER_COLORS = {
    "entry": "#8b5cf6",     # Purple
    "api": "#3b82f6",       # Blue
    "service": "#10b981",   # Emerald
    "model": "#f59e0b",     # Amber
    "ui": "#ec4899",        # Pink
    "config": "#64748b",    # Slate
    "util": "#06b6d4",      # Cyan
    "test": "#6366f1",      # Indigo
    "script": "#f97316",    # Orange
    "data": "#14b8a6",      # Teal
    "doc": "#a855f7",       # Purple-light
    "other": "#475569",     # Slate-dark
}


class CodeParserService:
    @classmethod
    def parse_repository(cls, repo_path: str) -> dict:
        base = Path(repo_path)
        symbols: list[dict] = []
        raw_dependencies: list[dict] = []
        external_dependencies: list[dict] = []
        files: list[dict] = []

        if not base.exists() or not base.is_dir():
            return {
                "symbols": [],
                "dependencies": [],
                "external_dependencies": [],
                "files": [],
                "architecture": cls.build_architecture_report([]),
            }

        # Collect all non-ignored project files
        for root, dirs, filenames in os.walk(base):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".git")]

            for file_name in filenames:
                file_path = Path(root) / file_name
                ext = file_path.suffix.lower()

                if ext in BINARY_SUFFIXES:
                    continue

                rel = str(file_path.relative_to(base)).replace("\\", "/")
                # Skip any paths that somehow contain ignored directories
                parts = rel.split("/")
                if any(part in IGNORED_DIRS for part in parts):
                    continue

                try:
                    text = file_path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    text = ""

                line_count = len(text.splitlines())
                char_count = len(text)
                classification = cls._classify_file(rel, text)
                language = EXTENSION_TO_LANGUAGE.get(ext, "unknown")

                file_info = {
                    "file_path": rel,
                    "language": language,
                    "line_count": line_count,
                    "char_count": char_count,
                    **classification,
                }
                files.append(file_info)

                # Extract symbols and imports based on language
                if ext in {".py", ".pyw"}:
                    py_symbols, py_deps, py_ext_deps = cls._parse_python(rel, text)
                    symbols.extend(py_symbols)
                    raw_dependencies.extend(py_deps)
                    external_dependencies.extend(py_ext_deps)
                elif ext in {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"}:
                    js_symbols, js_deps, js_ext_deps = cls._parse_javascript(rel, text)
                    symbols.extend(js_symbols)
                    raw_dependencies.extend(js_deps)
                    external_dependencies.extend(js_ext_deps)
                elif ext in {".php", ".phtml"}:
                    php_symbols, php_deps, php_ext_deps = cls._parse_php(rel, text)
                    symbols.extend(php_symbols)
                    raw_dependencies.extend(php_deps)
                    external_dependencies.extend(php_ext_deps)
                elif ext == ".java":
                    java_symbols, java_deps, java_ext_deps = cls._parse_java(rel, text)
                    symbols.extend(java_symbols)
                    raw_dependencies.extend(java_deps)
                    external_dependencies.extend(java_ext_deps)
                elif ext == ".cs":
                    cs_symbols, cs_deps, cs_ext_deps = cls._parse_csharp(rel, text)
                    symbols.extend(cs_symbols)
                    raw_dependencies.extend(cs_deps)
                    external_dependencies.extend(cs_ext_deps)
                elif ext in {".c", ".cpp", ".cc", ".cxx", ".h", ".hpp"}:
                    c_symbols, c_deps, c_ext_deps = cls._parse_c_cpp(rel, text)
                    symbols.extend(c_symbols)
                    raw_dependencies.extend(c_deps)
                    external_dependencies.extend(c_ext_deps)
                elif ext == ".go":
                    go_symbols, go_deps, go_ext_deps = cls._parse_go(rel, text)
                    symbols.extend(go_symbols)
                    raw_dependencies.extend(go_deps)
                    external_dependencies.extend(go_ext_deps)
                elif ext == ".rs":
                    rs_symbols = cls._parse_generic_symbols(rel, text)
                    symbols.extend(rs_symbols)
                elif ext in {".html", ".htm"}:
                    symbols.append({"file_path": rel, "symbol": Path(rel).stem, "kind": "view"})
                elif ext == ".sql":
                    symbols.extend(cls._parse_sql(rel, text))

        all_file_paths = [entry["file_path"] for entry in files]
        dependencies = cls._resolve_internal_dependencies(raw_dependencies, all_file_paths)

        return {
            "symbols": symbols,
            "dependencies": dependencies,
            "external_dependencies": external_dependencies,
            "files": files,
            "architecture": cls.build_architecture_report(files),
        }

    @staticmethod
    def _parse_python(rel: str, text: str) -> tuple[list[dict], list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []
        ext_deps: list[dict] = []

        try:
            tree = ast.parse(text)
        except SyntaxError:
            # Fallback to regex parser
            for cls_match in re.finditer(r"class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:", text):
                symbols.append({"file_path": rel, "symbol": cls_match.group(1), "kind": "class", "bases": cls_match.group(2) or ""})
            for func_match in re.finditer(r"(?:def|async def)\s+([A-Za-z0-9_]+)\s*\(", text):
                symbols.append({"file_path": rel, "symbol": func_match.group(1), "kind": "function"})
            return symbols, deps, ext_deps

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                base_names = []
                for b in node.bases:
                    if isinstance(b, ast.Name):
                        base_names.append(b.id)
                    elif isinstance(b, ast.Attribute):
                        base_names.append(b.attr)
                symbols.append({
                    "file_path": rel,
                    "symbol": node.name,
                    "kind": "class",
                    "bases": ", ".join(base_names),
                })
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                symbols.append({"file_path": rel, "symbol": node.name, "kind": "function"})
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    deps.append({"source": rel, "target": alias.name, "is_relative": False})
            elif isinstance(node, ast.ImportFrom):
                if node.level and node.level > 0:
                    # Relative import (e.g., from . import utils or from ..api import routes)
                    mod = node.module or ""
                    deps.append({
                        "source": rel,
                        "target": mod,
                        "is_relative": True,
                        "level": node.level,
                        "imported_names": [a.name for a in node.names],
                    })
                elif node.module:
                    deps.append({"source": rel, "target": node.module, "is_relative": False})

        return symbols, deps, ext_deps

    @staticmethod
    def _parse_javascript(rel: str, text: str) -> tuple[list[dict], list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []
        ext_deps: list[dict] = []

        # Classes
        for match in re.finditer(r"class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?", text):
            symbols.append({
                "file_path": rel,
                "symbol": match.group(1),
                "kind": "class",
                "bases": match.group(2) or "",
            })

        # Functions
        for match in re.finditer(r"(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "function"})

        # Arrow functions and const components
        for match in re.finditer(r"(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "function"})

        # Interfaces & Types (TypeScript)
        for match in re.finditer(r"(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]+)", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "interface"})

        # Imports: import ... from "..." or require("...")
        import_patterns = [
            r"""(?:import|export)\s+(?:(?:(?:\w+|\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+)?['"]([^'"]+)['"])""",
            r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)""",
            r"""import\s*\(\s*['"]([^'"]+)['"]\s*\)""",
        ]
        for pat in import_patterns:
            for match in re.finditer(pat, text):
                target = match.group(1)
                deps.append({"source": rel, "target": target, "is_relative": target.startswith(".")})

        return symbols, deps, ext_deps

    @staticmethod
    def _parse_php(rel: str, text: str) -> tuple[list[dict], list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []
        ext_deps: list[dict] = []

        # Classes
        for match in re.finditer(r"class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?", text):
            symbols.append({
                "file_path": rel,
                "symbol": match.group(1),
                "kind": "class",
                "bases": match.group(2) or "",
            })

        # Functions
        for match in re.finditer(r"function\s+([A-Za-z0-9_]+)\s*\(", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "function"})

        # Interfaces & Traits
        for match in re.finditer(r"(?:interface|trait)\s+([A-Za-z0-9_]+)", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "interface"})

        # Requires / Includes / Uses
        for match in re.finditer(r"""(?:require|require_once|include|include_once)\s*(?:\(\s*)?['"]([^'"]+)['"]""", text):
            deps.append({"source": rel, "target": match.group(1), "is_relative": True})

        for match in re.finditer(r"""use\s+([A-Za-z0-9_\\]+);""", text):
            target = match.group(1).replace("\\", "/")
            deps.append({"source": rel, "target": target, "is_relative": False})

        return symbols, deps, ext_deps

    @staticmethod
    def _parse_java(rel: str, text: str) -> tuple[list[dict], list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []
        ext_deps: list[dict] = []

        for match in re.finditer(r"class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?", text):
            symbols.append({
                "file_path": rel,
                "symbol": match.group(1),
                "kind": "class",
                "bases": match.group(2) or "",
            })
        for match in re.finditer(r"(?:public|protected|private)?\s*(?:static\s+)?[A-Za-z0-9_<>\[\]]+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{", text):
            func_name = match.group(1)
            if func_name not in {"if", "for", "while", "switch", "catch"}:
                symbols.append({"file_path": rel, "symbol": func_name, "kind": "function"})

        for match in re.finditer(r"import\s+(?:static\s+)?([A-Za-z0-9_.*]+);", text):
            deps.append({"source": rel, "target": match.group(1).replace(".", "/"), "is_relative": False})

        return symbols, deps, ext_deps

    @staticmethod
    def _parse_csharp(rel: str, text: str) -> tuple[list[dict], list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []
        ext_deps: list[dict] = []

        for match in re.finditer(r"class\s+([A-Za-z0-9_]+)(?:\s*:\s*([A-Za-z0-9_]+))?", text):
            symbols.append({
                "file_path": rel,
                "symbol": match.group(1),
                "kind": "class",
                "bases": match.group(2) or "",
            })

        for match in re.finditer(r"using\s+([A-Za-z0-9_.]+);", text):
            deps.append({"source": rel, "target": match.group(1).replace(".", "/"), "is_relative": False})

        return symbols, deps, ext_deps

    @staticmethod
    def _parse_c_cpp(rel: str, text: str) -> tuple[list[dict], list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []
        ext_deps: list[dict] = []

        for match in re.finditer(r"(?:class|struct)\s+([A-Za-z0-9_]+)", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "class"})

        for match in re.finditer(r"""#include\s*["<]([^">]+)[">]""", text):
            target = match.group(1)
            deps.append({"source": rel, "target": target, "is_relative": not target.startswith("<")})

        return symbols, deps, ext_deps

    @staticmethod
    def _parse_go(rel: str, text: str) -> tuple[list[dict], list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []
        ext_deps: list[dict] = []

        for match in re.finditer(r"type\s+([A-Za-z0-9_]+)\s+(?:struct|interface)", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "class"})
        for match in re.finditer(r"func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(", text):
            symbols.append({"file_path": rel, "symbol": match.group(1), "kind": "function"})

        for match in re.finditer(r"""import\s+['"]([^'"]+)['"]""", text):
            deps.append({"source": rel, "target": match.group(1), "is_relative": False})

        return symbols, deps, ext_deps

    @staticmethod
    def _parse_sql(rel: str, text: str) -> list[dict]:
        symbols = []
        for match in re.finditer(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_`\"']+)", text, re.IGNORECASE):
            table_name = match.group(1).strip("`\"'")
            symbols.append({"file_path": rel, "symbol": table_name, "kind": "table"})
        return symbols

    @staticmethod
    def _parse_generic_symbols(rel: str, text: str) -> list[dict]:
        rows = []
        for class_name in re.findall(r"class\s+(\w+)", text):
            rows.append({"file_path": rel, "symbol": class_name, "kind": "class"})
        for func_name in re.findall(r"(?:function|def|fn)\s+(\w+)\s*\(", text):
            rows.append({"file_path": rel, "symbol": func_name, "kind": "function"})
        return rows

    @classmethod
    def _resolve_internal_dependencies(cls, raw_deps: list[dict], all_files: list[str]) -> list[dict]:
        """Resolves import target strings against actual files in the repository."""
        file_set = set(all_files)
        # Mapping from file stem to list of matching full paths (e.g. 'utils' -> ['utils.py', 'app/utils.py'])
        stem_to_paths: dict[str, list[str]] = {}
        # Mapping from path without extension to full path
        no_ext_to_path: dict[str, str] = {}

        for p in all_files:
            stem = Path(p).stem
            stem_to_paths.setdefault(stem, []).append(p)
            base_p = str(Path(p).with_suffix(""))
            no_ext_to_path[base_p] = p

        resolved: list[dict] = []
        seen = set()

        for edge in raw_deps:
            source = edge.get("source", "")
            raw_target = edge.get("target", "").strip().strip("'\"")
            if not source or not raw_target:
                continue

            target_resolved = cls._resolve_single_target(
                source, raw_target, edge.get("is_relative", False), edge.get("level", 0),
                edge.get("imported_names", []), file_set, stem_to_paths, no_ext_to_path
            )

            if target_resolved and target_resolved != source:
                key = (source, target_resolved)
                if key not in seen:
                    seen.add(key)
                    resolved.append({"source": source, "target": target_resolved})

        return resolved

    @classmethod
    def _resolve_single_target(
        cls,
        source: str,
        target: str,
        is_relative: bool,
        level: int,
        imported_names: list[str],
        file_set: set[str],
        stem_to_paths: dict[str, list[str]],
        no_ext_to_path: dict[str, str],
    ) -> str | None:
        source_dir = str(Path(source).parent).replace("\\", "/")
        if source_dir == ".":
            source_dir = ""

        # Case 1: Relative imports (e.g. ./utils, ../components/Shell, or Python from . import utils)
        if is_relative:
            if level > 0:
                # Python level: 1 = same dir, 2 = parent dir, etc.
                cur = Path(source).parent
                for _ in range(level - 1):
                    cur = cur.parent
                base_dir = str(cur).replace("\\", "/")
                if base_dir == ".":
                    base_dir = ""
                candidate_dir = f"{base_dir}/{target}".strip("/") if target else base_dir
            else:
                candidate_dir = os.path.normpath(f"{source_dir}/{target}").replace("\\", "/")

            # Direct match
            if candidate_dir in file_set:
                return candidate_dir

            # Match with code extensions
            for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".php", ".java", "/index.ts", "/index.tsx", "/index.js"]:
                probe = f"{candidate_dir}{ext}"
                if probe in file_set:
                    return probe

            # Check if candidate_dir matches imported_names in that folder
            for name in imported_names:
                probe = f"{candidate_dir}/{name}.py"
                if probe in file_set:
                    return probe

            return None

        # Case 2: Direct match with known file
        if target in file_set:
            return target

        # Clean target: replace dots with slashes (e.g. app.services.chat_service -> app/services/chat_service)
        slash_target = target.replace(".", "/")
        if slash_target in file_set:
            return slash_target

        for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".php", ".java"]:
            probe = f"{slash_target}{ext}"
            if probe in file_set:
                return probe

        # Check relative to source_dir (e.g. import utils from app.py where utils.py is in the same dir)
        if source_dir:
            probe_in_source = f"{source_dir}/{target}"
            if probe_in_source in file_set:
                return probe_in_source
            for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".php"]:
                probe = f"{probe_in_source}{ext}"
                if probe in file_set:
                    return probe

        # Check if stem matches a unique file in the repository (e.g., import utils -> utils.py)
        stem = Path(target.replace(".", "/")).name
        if stem in stem_to_paths:
            candidates = stem_to_paths[stem]
            # If only one file matches, return it
            if len(candidates) == 1:
                return candidates[0]
            # If multiple, prefer one sharing the same directory
            for c in candidates:
                if source_dir and c.startswith(source_dir):
                    return c
            return candidates[0]

        return None

    @classmethod
    def build_architecture_report(cls, files: list[dict]) -> dict:
        folder_structure: list[str] = []
        layers: dict[str, list[str]] = {
            "entry": [],
            "api": [],
            "service": [],
            "model": [],
            "ui": [],
            "config": [],
            "util": [],
            "test": [],
            "script": [],
            "data": [],
            "doc": [],
            "other": [],
        }

        seen_dirs: set[str] = set()
        for item in files:
            rel = item.get("file_path", "")
            if not rel:
                continue

            parts = rel.split("/")[:-1]
            for idx in range(1, len(parts) + 1):
                folder = "/".join(parts[:idx])
                if folder and folder not in seen_dirs and not folder.startswith("."):
                    seen_dirs.add(folder)
                    folder_structure.append(folder)

            layer = item.get("layer", "other")
            if layer not in layers:
                layer = "other"
            layers[layer].append(rel)

        mermaid_lines = ["graph TD", '  User["User / Client"]']
        if layers["entry"]:
            mermaid_lines.append('  Entry["Entry Points"]')
            mermaid_lines.append("  User --> Entry")
        if layers["ui"]:
            mermaid_lines.append('  UI["UI / Frontend Views"]')
            prev = "Entry" if layers["entry"] else "User"
            mermaid_lines.append(f"  {prev} --> UI")
        if layers["api"]:
            mermaid_lines.append('  API["API Routes / Controllers"]')
            prev = "UI" if layers["ui"] else ("Entry" if layers["entry"] else "User")
            mermaid_lines.append(f"  {prev} --> API")
        if layers["service"]:
            mermaid_lines.append('  Services["Business Services / Logic"]')
            prev = "API" if layers["api"] else ("Entry" if layers["entry"] else "User")
            mermaid_lines.append(f"  {prev} --> Services")
        if layers["model"]:
            mermaid_lines.append('  Models["Models / Schemas"]')
            prev = "Services" if layers["service"] else ("API" if layers["api"] else "User")
            mermaid_lines.append(f"  {prev} --> Models")
        if layers["data"]:
            mermaid_lines.append('  Data["Datasets / Storage"]')
            prev = "Models" if layers["model"] else ("Services" if layers["service"] else "Entry")
            mermaid_lines.append(f"  {prev} --> Data")
        if layers["config"]:
            mermaid_lines.append('  Config["Config & Environment"]')
            prev = "Services" if layers["service"] else "Entry"
            mermaid_lines.append(f"  {prev} -.-> Config")


        return {
            "folder_structure": folder_structure[:200],
            "layers": {k: v[:30] for k, v in layers.items()},
            "mermaid": "\n".join(mermaid_lines),
        }

    @staticmethod
    def _classify_file(rel: str, text: str) -> dict:
        name = rel.rsplit("/", 1)[-1].lower()
        path_lower = rel.lower()
        layer = "other"
        kind = "other"
        is_entry_point = False

        if name in {
            "main.py", "app.py", "index.ts", "index.tsx", "index.js", "server.js",
            "program.cs", "app.java", "index.php", "main.go", "main.rs"
        }:
            is_entry_point = True
            layer = "entry"
            kind = "entry"
        elif any(seg in path_lower for seg in ["/api/", "/routes/", "/controllers/", "/handlers/"]) or any(k in name for k in ["route", "controller", "handler", "endpoint"]):
            layer = "api"
            kind = "api"
        elif any(seg in path_lower for seg in ["/services/", "/service/", "/logic/", "/usecase/"]) or "service" in name:
            layer = "service"
            kind = "service"
        elif any(seg in path_lower for seg in ["/models/", "/model/", "/schemas/", "/schema/", "/entities/"]) or any(k in name for k in ["model", "schema", "entity", "dto"]):
            layer = "model"
            kind = "model"
        elif any(seg in path_lower for seg in ["/components/", "/pages/", "/views/", "/templates/", "/static/", "/assets/"]) or name.endswith((".html", ".css", ".scss", ".vue", ".svelte")):
            layer = "ui"
            kind = "ui"
        elif any(seg in path_lower for seg in ["/config/", "/configs/", "/settings/"]) or any(k in name for k in ["config", "setting", ".env", "dockerfile", "makefile"]):
            layer = "config"
            kind = "config"
        elif any(seg in path_lower for seg in ["/utils/", "/util/", "/helpers/", "/common/", "/lib/"]) or any(k in name for k in ["util", "helper", "common"]):
            layer = "util"
            kind = "util"
        elif any(seg in path_lower for seg in ["/tests/", "/test/", "/spec/"]) or any(k in name for k in ["test_", "_test.", "spec.", ".spec."]):
            layer = "test"
            kind = "test"
        elif any(seg in path_lower for seg in ["/scripts/", "/tools/"]) or any(k in name for k in ["train.py", "eval.py", "run.", "migrate."]):
            layer = "script"
            kind = "script"
        elif any(seg in path_lower for seg in ["/data/", "/dataset/", "/datasets/"]) or name.endswith((".csv", ".json", ".sql")):
            layer = "data"
            kind = "data"
        elif any(seg in path_lower for seg in ["/docs/", "/doc/"]) or name.endswith((".md", ".rst", ".txt")):
            layer = "doc"
            kind = "doc"

        if "if __name__ == '__main__'" in text or 'if __name__ == "__main__"' in text:
            is_entry_point = True
            if layer == "other":
                layer = "entry"
                kind = "entry"

        return {"kind": kind, "layer": layer, "is_entry_point": is_entry_point}

    @classmethod
    def to_cytoscape(cls, files: list[dict], dependencies: list[dict]) -> list[dict]:
        """Generates Cytoscape elements containing ALL files as nodes, with internal dependency edges."""
        elements = []
        node_ids = set()

        # Add all files as nodes
        for f in files:
            path = f.get("file_path", "")
            if not path or path in node_ids:
                continue

            node_ids.add(path)
            basename = Path(path).name
            layer = f.get("layer", "other")
            color = LAYER_COLORS.get(layer, "#475569")
            lines = f.get("line_count", 0)

            elements.append({
                "data": {
                    "id": path,
                    "label": basename,
                    "full_path": path,
                    "layer": layer,
                    "language": f.get("language", "unknown"),
                    "lines": lines,
                    "color": color,
                }
            })

        # Add dependency edges
        edge_seen = set()
        for edge in dependencies:
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            if not src or not tgt or src not in node_ids or tgt not in node_ids or src == tgt:
                continue

            edge_key = (src, tgt)
            if edge_key in edge_seen:
                continue
            edge_seen.add(edge_key)

            elements.append({
                "data": {
                    "id": f"{src}->{tgt}",
                    "source": src,
                    "target": tgt,
                }
            })

        return elements

    @staticmethod
    def to_mermaid(symbols: list[dict], dependencies: list[dict]) -> str:
        """Fallback Mermaid diagram generator for modules and symbols."""
        classes = [s for s in symbols if s.get("kind") == "class"]
        if classes:
            lines = ["classDiagram"]
            for c in classes[:40]:
                clean_name = re.sub(r"[^A-Za-z0-9_]", "_", c.get("symbol", ""))
                if clean_name:
                    lines.append(f"  class {clean_name}")
            return "\n".join(lines)

        lines = ["graph TD"]
        for edge in dependencies[:50]:
            src = re.sub(r"[^A-Za-z0-9_]", "_", Path(edge.get("source", "")).stem)
            tgt = re.sub(r"[^A-Za-z0-9_]", "_", Path(edge.get("target", "")).stem)
            if src and tgt and src != tgt:
                lines.append(f"  {src} --> {tgt}")
        if len(lines) == 1:
            lines.append("  Main --> Modules")
        return "\n".join(lines)
