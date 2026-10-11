from parser.repo_parser import parse_repository
from app.services.code_parser_service import CodeParserService
from app.services.uml_service import UMLService
from app.services.dependency_service import DependencyService


def test_parse_repository_returns_shape(tmp_path):
    sample = tmp_path / "sample"
    sample.mkdir()
    (sample / "a.py").write_text("print('hi')\n", encoding="utf-8")

    result = parse_repository(str(sample))

    assert "file_count" in result
    assert "files" in result
    assert result["file_count"] == 1


def test_parse_repository_retrieves_multi_language_and_ignores_vendors(tmp_path):
    repo = tmp_path / "full_repo"
    repo.mkdir()
    (repo / "main.py").write_text("import utils\nclass App:\n    pass\n", encoding="utf-8")
    (repo / "utils.py").write_text("def helper(): pass\n", encoding="utf-8")
    (repo / "index.php").write_text("<?php class Controller {} ?>\n", encoding="utf-8")
    (repo / "app.ts").write_text("export class Service {}\n", encoding="utf-8")
    (repo / "package.json").write_text('{"name": "test"}\n', encoding="utf-8")
    (repo / "style.css").write_text("body { margin: 0; }\n", encoding="utf-8")

    # Vendor and cache directories that must be ignored
    nm = repo / "node_modules"
    nm.mkdir()
    (nm / "dep.js").write_text("module.exports = {};\n", encoding="utf-8")

    git_dir = repo / ".git"
    git_dir.mkdir()
    (git_dir / "config").write_text("git config\n", encoding="utf-8")

    # Test root repo_parser
    root_result = parse_repository(str(repo))
    assert root_result["file_count"] == 6
    paths = [f["path"] for f in root_result["files"]]
    assert "main.py" in paths
    assert "utils.py" in paths
    assert "index.php" in paths
    assert "app.ts" in paths
    assert "package.json" in paths
    assert "style.css" in paths
    assert not any("node_modules" in p for p in paths)
    assert not any(".git" in p for p in paths)

    # Test CodeParserService
    parsed = CodeParserService.parse_repository(str(repo))
    assert len(parsed["files"]) == 6
    assert len(parsed["symbols"]) >= 4

    # Verify dependency resolution connects main.py -> utils.py
    deps = parsed["dependencies"]
    assert any(d["source"] == "main.py" and d["target"] == "utils.py" for d in deps)

    # Verify Cytoscape elements contains all 6 files
    cy_elements = CodeParserService.to_cytoscape(parsed["files"], parsed["dependencies"])
    node_ids = [e["data"]["id"] for e in cy_elements if not e["data"].get("source")]
    assert len(node_ids) == 6
    assert "main.py" in node_ids
    assert "index.php" in node_ids

    # Verify UMLService
    uml = UMLService.generate(str(repo))
    assert len(uml["classes"]) >= 3
    assert "classDiagram" in uml["mermaid"]


def test_dependency_service_circular_detection():
    adjacency = {
        "a.py": {"b.py"},
        "b.py": {"c.py"},
        "c.py": {"a.py"},
        "d.py": {"e.py"},
    }
    circular = DependencyService._find_circular_dependencies(adjacency)
    assert len(circular) >= 1
