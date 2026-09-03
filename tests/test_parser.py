from parser.repo_parser import parse_repository


def test_parse_repository_returns_shape(tmp_path):
    sample = tmp_path / "sample"
    sample.mkdir()
    (sample / "a.py").write_text("print('hi')\n", encoding="utf-8")

    result = parse_repository(str(sample))

    assert "file_count" in result
    assert "files" in result
    assert result["file_count"] == 1
