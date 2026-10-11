from __future__ import annotations

import os
import re
from pathlib import Path

from app.services.code_parser_service import IGNORED_DIRS, BINARY_SUFFIXES


class UMLService:
    @staticmethod
    def generate(repo_path: str) -> dict:
        base = Path(repo_path)
        classes: list[dict] = []
        relations: list[dict] = []
        modules: list[dict] = []

        if not base.exists() or not base.is_dir():
            return {
                "classes": [],
                "relations": [],
                "mermaid": "classDiagram\n  class EmptyProject",
            }

        # Traverse all files in repository
        for root, dirs, filenames in os.walk(base):
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".git")]

            for file_name in filenames:
                file_path = Path(root) / file_name
                ext = file_path.suffix.lower()
                if ext in BINARY_SUFFIXES:
                    continue

                rel = str(file_path.relative_to(base)).replace("\\", "/")
                try:
                    text = file_path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                # Check for modules/functions
                funcs = re.findall(r"(?:def|function|async def|fn)\s+([A-Za-z0-9_]+)\s*\(", text)
                if funcs:
                    modules.append({"file": rel, "functions": funcs[:8]})

                # Python classes
                if ext in {".py", ".pyw"}:
                    for match in re.finditer(r"class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:", text):
                        cname = match.group(1)
                        bases_str = match.group(2) or ""
                        bases = [b.strip() for b in bases_str.split(",") if b.strip() and b.strip() != "object"]
                        # Extract methods in this class
                        methods = re.findall(r"def\s+([A-Za-z0-9_]+)\s*\(", text)
                        clean_methods = [m for m in methods if not m.startswith("__")][:5]
                        classes.append({"name": cname, "file": rel, "methods": clean_methods})
                        for b in bases:
                            # Clean base name (e.g. models.Model -> Model)
                            clean_b = b.split(".")[-1]
                            relations.append({"from": cname, "to": clean_b, "type": "extends"})

                # JS / TS / Java / C# / PHP classes
                elif ext in {".js", ".jsx", ".ts", ".tsx", ".java", ".cs", ".php"}:
                    # class Foo extends Bar
                    for match in re.finditer(r"class\s+([A-Za-z0-9_]+)(?:\s+(?:extends|:)\s+([A-Za-z0-9_]+))?(?:\s+implements\s+([A-Za-z0-9_,\s]+))?", text):
                        cname = match.group(1)
                        parent = match.group(2)
                        interfaces = match.group(3)
                        methods = re.findall(r"(?:public|protected|private)?\s*(?:static\s+)?[A-Za-z0-9_<>\[\]]+\s+([A-Za-z0-9_]+)\s*\(", text)
                        clean_methods = [m for m in methods if m not in {"if", "for", "while", "switch", "catch", "constructor"}][:5]
                        classes.append({"name": cname, "file": rel, "methods": clean_methods})
                        if parent:
                            relations.append({"from": cname, "to": parent, "type": "extends"})
                        if interfaces:
                            for iface in interfaces.split(","):
                                iface = iface.strip()
                                if iface:
                                    relations.append({"from": cname, "to": iface, "type": "implements"})

        # Deduplicate classes by name
        unique_classes: list[dict] = []
        seen_cnames = set()
        for c in classes:
            if c["name"] not in seen_cnames:
                seen_cnames.add(c["name"])
                unique_classes.append(c)

        # Build Mermaid diagram
        if unique_classes:
            mermaid_lines = ["classDiagram"]
            for c in unique_classes[:35]:
                safe_name = re.sub(r"[^A-Za-z0-9_]", "", c["name"])
                if not safe_name:
                    continue
                mermaid_lines.append(f"  class {safe_name} {{")
                for m in c.get("methods", [])[:3]:
                    safe_m = re.sub(r"[^A-Za-z0-9_]", "", m)
                    if safe_m:
                        mermaid_lines.append(f"    +{safe_m}()")
                mermaid_lines.append("  }")

            seen_rel = set()
            for r in relations[:50]:
                src = re.sub(r"[^A-Za-z0-9_]", "", r["from"])
                tgt = re.sub(r"[^A-Za-z0-9_]", "", r["to"])
                if src and tgt and src != tgt and (src, tgt) not in seen_rel:
                    seen_rel.add((src, tgt))
                    if r.get("type") == "implements":
                        mermaid_lines.append(f"  {tgt} <|.. {src}")
                    else:
                        mermaid_lines.append(f"  {tgt} <|-- {src}")

            mermaid_chart = "\n".join(mermaid_lines)
        else:
            # Procedural / functional / script repository: generate a Component Flow Diagram
            mermaid_lines = ["graph TD", '  subgraph ArchitectureWorkflow["Architecture Workflow"]']
            # Add top modules
            prev_node = None
            for idx, mod in enumerate(modules[:12]):
                safe_id = f"mod_{idx}"
                basename = Path(mod["file"]).name
                funcs_str = ", ".join(mod["functions"][:3])
                label = f"{basename} ({funcs_str})" if funcs_str else basename
                # Escape quotes
                clean_label = label.replace('"', "'")
                mermaid_lines.append(f'    {safe_id}["{clean_label}"]')
                if prev_node:
                    mermaid_lines.append(f"    {prev_node} --> {safe_id}")
                prev_node = safe_id
            mermaid_lines.append("  end")

            if len(modules) == 0:
                mermaid_lines = ["graph TD", '  Empty["Repository Structure Ready"]']

            mermaid_chart = "\n".join(mermaid_lines)

            # Map modules to pseudo-classes for the UI tables
            for m in modules[:25]:
                unique_classes.append({
                    "name": Path(m["file"]).stem,
                    "file": m["file"],
                    "methods": m["functions"],
                })

        return {
            "classes": unique_classes,
            "relations": relations,
            "mermaid": mermaid_chart,
        }
