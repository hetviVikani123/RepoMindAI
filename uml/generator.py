from __future__ import annotations

from pathlib import Path


def generate_class_mermaid(repo_path: str) -> str:
    base = Path(repo_path)
    lines = ["classDiagram"]

    for file_path in base.rglob("*.py"):
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        for line in text.splitlines():
            s = line.strip()
            if s.startswith("class "):
                name = s.split()[1].split("(")[0].replace(":", "")
                lines.append(f"class {name}")

    return "\n".join(lines)
