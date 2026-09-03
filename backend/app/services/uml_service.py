from __future__ import annotations

import re
from pathlib import Path


class UMLService:
    @staticmethod
    def generate(repo_path: str) -> dict:
        base = Path(repo_path)
        classes = []
        relations = []

        for file_path in base.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in {".py", ".java", ".ts"}:
                continue
            rel = str(file_path.relative_to(base)).replace("\\", "/")
            text = file_path.read_text(encoding="utf-8", errors="ignore")

            for class_name in re.findall(r"class\s+(\w+)", text):
                classes.append({"name": class_name, "file": rel})

            for lhs, rhs in re.findall(r"class\s+(\w+)\s*\((\w+)\)", text):
                relations.append({"from": lhs, "to": rhs, "type": "extends"})

        mermaid = ["classDiagram"]
        for c in classes:
            mermaid.append(f"class {c['name']}")
        for r in relations:
            mermaid.append(f"{r['to']} <|-- {r['from']}")

        return {
            "classes": classes,
            "relations": relations,
            "mermaid": "\n".join(mermaid),
        }
