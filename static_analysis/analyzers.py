from __future__ import annotations

from pathlib import Path


def complexity_metrics(repo_path: str) -> dict:
    base = Path(repo_path)
    file_scores = []

    for file_path in base.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() not in {".py", ".js", ".ts", ".tsx", ".java", ".cs"}:
            continue

        text = file_path.read_text(encoding="utf-8", errors="ignore")
        lines = text.splitlines()
        branches = sum(1 for l in lines if any(tok in l for tok in ["if ", "else", "switch", "for ", "while ", "try:"]))
        complexity = max(1, branches)

        file_scores.append(
            {
                "file": str(file_path.relative_to(base)).replace("\\", "/"),
                "cyclomatic_complexity": complexity,
                "line_count": len(lines),
            }
        )

    return {
        "files": file_scores,
        "total_files": len(file_scores),
    }


def find_dead_code_candidates(repo_path: str) -> dict:
    base = Path(repo_path)
    dead = []

    for file_path in base.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() not in {".py", ".js", ".ts", ".tsx"}:
            continue

        text = file_path.read_text(encoding="utf-8", errors="ignore")
        if "TODO: remove" in text or "# dead-code" in text:
            dead.append(str(file_path.relative_to(base)).replace("\\", "/"))

    return {"dead_code_candidates": dead}
