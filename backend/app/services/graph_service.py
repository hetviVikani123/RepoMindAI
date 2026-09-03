from __future__ import annotations

from app.core.config import settings


class GraphService:
    def __init__(self):
        self._enabled = bool(settings.neo4j_uri and settings.neo4j_password) and not settings.local_only
        self.driver = None
        if self._enabled:
            try:
                import importlib

                GraphDatabase = importlib.import_module("neo4j").GraphDatabase
            except (ImportError, AttributeError):
                self._enabled = False
                return

            self.driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password),
            )

    def index_symbols(self, repository_id: int, symbol_rows: list[dict]):
        if not self.driver:
            return

        query = """
        UNWIND $rows as row
        MERGE (f:File {repository_id: $repository_id, path: row.file_path})
        MERGE (s:Symbol {repository_id: $repository_id, name: row.symbol, kind: row.kind})
        MERGE (f)-[:DECLARES]->(s)
        """
        with self.driver.session() as session:
            session.run(query, repository_id=repository_id, rows=symbol_rows)

    def index_dependencies(self, repository_id: int, edges: list[dict]):
        if not self.driver:
            return

        query = """
        UNWIND $edges as edge
        MERGE (a:File {repository_id: $repository_id, path: edge.source})
        MERGE (b:File {repository_id: $repository_id, path: edge.target})
        MERGE (a)-[:DEPENDS_ON]->(b)
        """
        with self.driver.session() as session:
            session.run(query, repository_id=repository_id, edges=edges)
