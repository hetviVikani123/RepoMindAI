from __future__ import annotations

from pathlib import Path


class DependencyService:
    @staticmethod
    def generate_dependency_report(repo_path: str) -> dict:
        base = Path(repo_path)
        imports: dict[str, list[str]] = {}
        circular: list[tuple[str, str]] = []

        for file_path in base.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in {".py", ".js", ".ts", ".tsx"}:
                continue

            rel = str(file_path.relative_to(base)).replace("\\", "/")
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            deps = []
            for line in text.splitlines():
                s = line.strip()
                if s.startswith("import ") or s.startswith("from "):
                    deps.append(s)
            imports[rel] = deps

        files = list(imports.keys())
        for left in files:
            left_name = left.split("/")[-1].split(".")[0]
            for right in files:
                if left == right:
                    continue
                right_name = right.split("/")[-1].split(".")[0]
                left_refs_right = any(right_name in d for d in imports[left])
                right_refs_left = any(left_name in d for d in imports[right])
                if left_refs_right and right_refs_left:
                    pair = tuple(sorted((left, right)))
                    if pair not in circular:
                        circular.append(pair)

        return {
            "imports": imports,
            "circular_dependencies": circular,
            "module_count": len(imports),
        }
