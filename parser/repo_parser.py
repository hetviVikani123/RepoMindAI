from __future__ import annotations

import os
from pathlib import Path


IGNORED_DIRS = {
    ".git",
    "node_modules",
    "vendor",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".next",
    "dist",
    "build",
}

BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".zip", ".tar", ".gz",
    ".pdf", ".pptx", ".docx", ".xlsx", ".pkl", ".bin", ".exe", ".dll", ".so",
    ".mp4", ".mp3", ".wav", ".db", ".sqlite", ".pyc",
}


def parse_repository(repo_path: str) -> dict:
    base = Path(repo_path)
    files = []

    if not base.exists():
        return {"file_count": 0, "files": []}

    for root, dirs, filenames in os.walk(base):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".git")]
        for file_name in filenames:
            file_path = Path(root) / file_name
            ext = file_path.suffix.lower()
            if ext in BINARY_SUFFIXES:
                continue

            try:
                text = file_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                text = ""

            files.append(
                {
                    "path": str(file_path.relative_to(base)).replace("\\", "/"),
                    "line_count": len(text.splitlines()),
                    "char_count": len(text),
                }
            )

    return {
        "file_count": len(files),
        "files": files,
    }
