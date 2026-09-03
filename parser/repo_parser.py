from __future__ import annotations

from pathlib import Path


SUPPORTED = {".py", ".js", ".ts", ".tsx", ".java", ".cs"}


def parse_repository(repo_path: str) -> dict:
    base = Path(repo_path)
    files = []

    for file_path in base.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() not in SUPPORTED:
            continue
        text = file_path.read_text(encoding="utf-8", errors="ignore")
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
