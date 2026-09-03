from __future__ import annotations

import os
import re
from pathlib import Path


PIPELINE_STAGES = [
    "Repository Cloner",
    "Language Detector",
    "AST Parser",
    "Embedding Generator",
    "Knowledge Graph",
    "Static Analysis",
    "RAG Retriever",
]


class AnalysisService:
    @staticmethod
    def technical_debt(repo_path: str) -> dict:
        base = Path(repo_path)
        long_files = []
        duplicate_candidates = 0
        total_lines = 0
        complex_functions = []

        for file_path in base.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in {".py", ".js", ".ts", ".tsx", ".java", ".cs"}:
                continue
            lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
            line_count = len(lines)
            total_lines += line_count
            rel = str(file_path.relative_to(base)).replace("\\", "/")

            if line_count > 400:
                long_files.append(rel)

            # Detect deeply nested code (heuristic: lines with 4+ levels of indentation)
            deep_indent = sum(1 for l in lines if len(l) - len(l.lstrip()) >= 16 and l.strip())
            if deep_indent > 10:
                complex_functions.append({"file": rel, "deep_indent_lines": deep_indent})

            seen = set()
            for line in lines:
                normalized = line.strip()
                if len(normalized) > 40:
                    if normalized in seen:
                        duplicate_candidates += 1
                    seen.add(normalized)

        complexity_score = min(100, int((len(long_files) * 10) + (duplicate_candidates * 0.2)))
        maintainability = max(0, 100 - complexity_score)

        return {
            "debt_score": complexity_score,
            "maintainability": maintainability,
            "grade": _debt_grade(maintainability),
            "evidence": {
                "long_files": long_files,
                "duplicate_line_candidates": duplicate_candidates,
                "total_lines": total_lines,
                "complex_functions": complex_functions[:20],
            },
        }

    @staticmethod
    def security(repo_path: str) -> dict:
        base = Path(repo_path)
        findings = []
        risky_patterns = {
            "hardcoded_secret": ["API_KEY", "SECRET", "password =", "token ="],
            "sql_injection_risk": ["SELECT * FROM", 'cursor.execute(f"', "format("],
            "command_injection_risk": ["os.system(", "subprocess.Popen(", "shell=True"],
            "weak_jwt": ["jwt.decode(", "verify=False"],
            "insecure_random": ["random.random(", "Math.random("],
            "eval_usage": ["eval(", "exec("],
        }

        for file_path in base.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in {".py", ".js", ".ts", ".tsx", ".java", ".cs"}:
                continue
            rel = str(file_path.relative_to(base)).replace("\\", "/")
            text = file_path.read_text(encoding="utf-8", errors="ignore")

            for kind, patterns in risky_patterns.items():
                for pattern in patterns:
                    if pattern in text:
                        # Find line number
                        for i, line in enumerate(text.splitlines(), 1):
                            if pattern in line:
                                findings.append({
                                    "file": rel,
                                    "type": kind,
                                    "pattern": pattern,
                                    "line": i,
                                    "snippet": line.strip()[:120],
                                })
                                break

        severity = "low"
        if len(findings) > 20:
            severity = "critical"
        elif len(findings) > 10:
            severity = "high"
        elif len(findings) > 5:
            severity = "medium"

        return {
            "severity": severity,
            "findings_count": len(findings),
            "findings": findings[:200],
        }

    @staticmethod
    def architecture(repo_path: str) -> dict:
        """Generate an architecture report and Mermaid diagram from repo folder structure."""
        base = Path(repo_path)
        folder_structure = []
        layers: dict[str, list[str]] = {
            "entry": [],
            "api": [],
            "service": [],
            "model": [],
            "config": [],
            "util": [],
            "test": [],
            "other": [],
        }

        for item in sorted(base.rglob("*")):
            if item.is_dir() and not any(p.startswith(".") for p in item.parts):
                rel = str(item.relative_to(base)).replace("\\", "/")
                # Skip node_modules, .git, __pycache__, .venv
                if any(skip in rel for skip in ["node_modules", ".git", "__pycache__", ".venv", ".next"]):
                    continue
                folder_structure.append(rel)

        # Detect layers from file names / folder names
        for file_path in base.rglob("*"):
            if not file_path.is_file():
                continue
            rel = str(file_path.relative_to(base)).replace("\\", "/")
            name = file_path.name.lower()
            if any(skip in rel for skip in ["node_modules", ".git", "__pycache__", ".venv", ".next"]):
                continue
            if name in ("main.py", "index.ts", "app.py", "server.js", "index.js"):
                layers["entry"].append(rel)
            elif "route" in name or "controller" in name or "handler" in name:
                layers["api"].append(rel)
            elif "service" in name or "use_case" in name:
                layers["service"].append(rel)
            elif "model" in name or "schema" in name or "entity" in name:
                layers["model"].append(rel)
            elif "config" in name or "setting" in name or "env" in name:
                layers["config"].append(rel)
            elif "util" in name or "helper" in name or "lib" in name:
                layers["util"].append(rel)
            elif "test" in name or "spec" in name:
                layers["test"].append(rel)

        # Build Mermaid graph
        mermaid_lines = ["graph TD"]
        mermaid_lines.append('  User["👤 User / Browser"]')
        if layers["entry"]:
            mermaid_lines.append('  Entry["🚀 Entry Points"]')
            mermaid_lines.append("  User --> Entry")
        if layers["api"]:
            mermaid_lines.append('  API["🔀 Routes / Controllers"]')
            mermaid_lines.append("  Entry --> API" if layers["entry"] else "  User --> API")
        if layers["service"]:
            mermaid_lines.append('  Services["⚙️ Business Services"]')
            prev = "API" if layers["api"] else ("Entry" if layers["entry"] else "User")
            mermaid_lines.append(f"  {prev} --> Services")
        if layers["model"]:
            mermaid_lines.append('  Models["🗄️ Models / Schemas"]')
            prev = "Services" if layers["service"] else "API"
            mermaid_lines.append(f"  {prev} --> Models")
        mermaid_lines.append('  DB["💾 Database (SQLite)"]')
        mermaid_lines.append("  Models --> DB" if layers["model"] else "  Services --> DB")

        return {
            "folder_structure": folder_structure[:200],
            "layers": {k: v[:10] for k, v in layers.items()},
            "mermaid": "\n".join(mermaid_lines),
        }

    @staticmethod
    def generate_documentation(repo_path: str, repo_name: str, language: str, framework: str) -> dict:
        """Generate README, architecture doc, module docs, and API summary."""
        base = Path(repo_path)

        # Collect module info
        modules: dict[str, list[str]] = {}
        api_endpoints: list[str] = []
        class_list: list[str] = []

        for file_path in base.rglob("*"):
            if not file_path.is_file() or file_path.suffix.lower() not in {".py", ".js", ".ts", ".tsx", ".java", ".cs"}:
                continue
            rel = str(file_path.relative_to(base)).replace("\\", "/")
            if any(skip in rel for skip in ["node_modules", ".git", "__pycache__", ".venv", ".next", "dist"]):
                continue
            text = file_path.read_text(encoding="utf-8", errors="ignore")

            folder = rel.split("/")[0] if "/" in rel else "root"
            if folder not in modules:
                modules[folder] = []
            modules[folder].append(rel)

            # Extract classes
            for cls in re.findall(r"class\s+(\w+)", text):
                class_list.append(f"`{cls}` in `{rel}`")

            # Extract API routes (FastAPI / Express style)
            for route in re.findall(r'@(?:app|router)\.(?:get|post|put|delete|patch)\("([^"]+)"', text):
                api_endpoints.append(route)
            for route in re.findall(r'(?:router|app)\.(get|post|put|delete)\("([^"]+)"', text):
                api_endpoints.append(route[1])

        # Build README
        readme = f"""# {repo_name}

> Auto-generated documentation by RepoMind AI.

## Overview

This is a **{language}** project using the **{framework}** framework.

## Project Structure

| Module | Files |
|--------|-------|
"""
        for mod, files in list(modules.items())[:15]:
            readme += f"| `{mod}/` | {len(files)} files |\n"

        readme += f"""
## Key Classes

{chr(10).join(f'- {c}' for c in class_list[:20])}

## Getting Started

```bash
# Install dependencies
{"pip install -r requirements.txt" if language == "python" else "npm install"}

# Run the application
{"uvicorn app.main:app --reload" if framework == "fastapi" else "npm run dev"}
```

## Architecture

See [Architecture Documentation](./ARCHITECTURE.md) for the full diagram.
"""

        architecture_doc = f"""# Architecture — {repo_name}

## Technology Stack

- **Language**: {language}
- **Framework**: {framework}

## Layers

"""
        for mod in list(modules.keys())[:10]:
            architecture_doc += f"### `{mod}/`\n\nContains {len(modules[mod])} source files.\n\n"

        api_summary = "# API Summary\n\n"
        if api_endpoints:
            api_summary += "## Detected Endpoints\n\n"
            for ep in api_endpoints[:30]:
                api_summary += f"- `{ep}`\n"
        else:
            api_summary += "_No API endpoints detected automatically. Add route definitions to enable this._\n"

        module_docs: dict[str, str] = {}
        for mod, files in list(modules.items())[:8]:
            module_docs[mod] = (
                f"## Module: `{mod}/`\n\n"
                f"Contains **{len(files)}** source files.\n\n"
                "### Files\n\n"
                + "\n".join(f"- `{f}`" for f in files[:15])
            )

        return {
            "readme": readme,
            "architecture_doc": architecture_doc,
            "module_docs": module_docs,
            "api_summary": api_summary,
        }


def _debt_grade(maintainability: int) -> str:
    if maintainability >= 80:
        return "A"
    if maintainability >= 60:
        return "B"
    if maintainability >= 40:
        return "C"
    if maintainability >= 20:
        return "D"
    return "F"
