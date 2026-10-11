from __future__ import annotations

from app.services.code_parser_service import CodeParserService


class DependencyService:
    @staticmethod
    def generate_dependency_report(repo_path: str) -> dict:
        parsed = CodeParserService.parse_repository(repo_path)
        files = parsed.get("files", [])
        edges = parsed.get("dependencies", [])
        external_deps = parsed.get("external_dependencies", [])

        imports: dict[str, list[str]] = {entry.get("file_path", ""): [] for entry in files if entry.get("file_path")}
        adjacency: dict[str, set[str]] = {}

        for edge in edges:
            source = edge.get("source", "")
            target = edge.get("target", "")
            if not source or not target:
                continue
            imports.setdefault(source, []).append(target)
            adjacency.setdefault(source, set()).add(target)

        circular = DependencyService._find_circular_dependencies(adjacency)

        return {
            "imports": {key: sorted(set(value)) for key, value in imports.items()},
            "circular_dependencies": circular,
            "module_count": len(imports),
            "external_dependencies": external_deps[:50],
        }

    @staticmethod
    def _find_circular_dependencies(adjacency: dict[str, set[str]]) -> list[tuple[str, str]]:
        circular: list[tuple[str, str]] = []
        seen: set[tuple[str, str]] = set()

        def reaches(start: str, target: str) -> bool:
            stack = list(adjacency.get(start, set()))
            visited = {start}
            while stack:
                node = stack.pop()
                if node == target:
                    return True
                if node in visited:
                    continue
                visited.add(node)
                stack.extend(adjacency.get(node, set()))
            return False

        for source, targets in adjacency.items():
            for target in targets:
                pair = tuple(sorted((source, target)))
                if pair in seen:
                    continue
                if reaches(target, source):
                    circular.append(pair)
                    seen.add(pair)

        return circular
