from __future__ import annotations

import ast
import re
from pathlib import Path


class CodeParserService:
    SUPPORTED_SUFFIXES = {".py", ".js", ".ts", ".tsx", ".java", ".cs"}

    @classmethod
    def parse_repository(cls, repo_path: str) -> dict:
        base = Path(repo_path)
        symbols: list[dict] = []
        dependencies: list[dict] = []

        for file_path in base.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in cls.SUPPORTED_SUFFIXES:
                continue

            rel = str(file_path.relative_to(base)).replace("\\", "/")
            text = file_path.read_text(encoding="utf-8", errors="ignore")

            if file_path.suffix.lower() == ".py":
                py_symbols, py_deps = cls._parse_python(rel, text)
                symbols.extend(py_symbols)
                dependencies.extend(py_deps)
            else:
                symbols.extend(cls._parse_generic_symbols(rel, text))
                dependencies.extend(cls._parse_generic_dependencies(rel, text))

        return {
            "symbols": symbols,
            "dependencies": dependencies,
        }

    @staticmethod
    def _parse_python(rel: str, text: str) -> tuple[list[dict], list[dict]]:
        symbols: list[dict] = []
        deps: list[dict] = []

        try:
            tree = ast.parse(text)
        except SyntaxError:
            return symbols, deps

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                symbols.append({"file_path": rel, "symbol": node.name, "kind": "class"})
            elif isinstance(node, ast.FunctionDef):
                symbols.append({"file_path": rel, "symbol": node.name, "kind": "function"})
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    deps.append({"source": rel, "target": alias.name.replace(".", "/") + ".py"})
            elif isinstance(node, ast.ImportFrom) and node.module:
                deps.append({"source": rel, "target": node.module.replace(".", "/") + ".py"})

        return symbols, deps

    @staticmethod
    def _parse_generic_symbols(rel: str, text: str) -> list[dict]:
        rows = []
        for class_name in re.findall(r"class\s+(\w+)", text):
            rows.append({"file_path": rel, "symbol": class_name, "kind": "class"})
        for func_name in re.findall(r"(?:function|def)\s+(\w+)\s*\(", text):
            rows.append({"file_path": rel, "symbol": func_name, "kind": "function"})
        return rows

    @staticmethod
    def _parse_generic_dependencies(rel: str, text: str) -> list[dict]:
        deps = []
        for statement in re.findall(r"(?:import|from)\s+([^\n;]+)", text):
            normalized = statement.strip().split()[0].strip("'\"")
            deps.append({"source": rel, "target": normalized.replace(".", "/")})
        return deps

    @staticmethod
    def to_cytoscape(dependencies: list[dict]) -> list[dict]:
        nodes = set()
        elements = []

        for edge in dependencies:
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            if not src or not tgt:
                continue
            if src not in nodes:
                nodes.add(src)
                elements.append({"data": {"id": src, "label": src}})
            if tgt not in nodes:
                nodes.add(tgt)
                elements.append({"data": {"id": tgt, "label": tgt}})
            elements.append({"data": {"id": f"{src}->{tgt}", "source": src, "target": tgt}})

        return elements

    @staticmethod
    def to_mermaid(symbols: list[dict], dependencies: list[dict]) -> str:
        lines = ["classDiagram"]

        for symbol in symbols:
            if symbol.get("kind") == "class":
                lines.append(f"class {symbol['symbol']}")

        for edge in dependencies[:200]:
            src = edge.get("source", "").replace("/", "_").replace(".", "_")
            tgt = edge.get("target", "").replace("/", "_").replace(".", "_")
            if src and tgt:
                lines.append(f"{src} ..> {tgt}")

        return "\n".join(lines)
