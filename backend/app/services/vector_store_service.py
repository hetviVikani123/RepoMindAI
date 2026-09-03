from __future__ import annotations

import hashlib

from app.core.config import settings

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams
except ImportError:  # pragma: no cover - optional dependency for non-local modes
    QdrantClient = None
    Distance = FieldCondition = Filter = MatchValue = PointStruct = VectorParams = None


class VectorStoreService:
    def __init__(self):
        self._enabled = bool(settings.qdrant_url) and not settings.local_only and QdrantClient is not None
        self.client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key) if self._enabled else None

        if self.client:
            collections = [c.name for c in self.client.get_collections().collections]
            if settings.qdrant_collection not in collections:
                self.client.create_collection(
                    collection_name=settings.qdrant_collection,
                    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
                )

    def upsert(self, repository_id: int, file_path: str, chunk: str, vector: list[float]):
        if not self.client:
            return

        point = PointStruct(
            id=self._point_id(repository_id, file_path, chunk),
            vector=vector,
            payload={
                "repository_id": repository_id,
                "file_path": file_path,
                "chunk": chunk,
            },
        )
        self.client.upsert(collection_name=settings.qdrant_collection, points=[point])

    def search(self, repository_id: int, vector: list[float], top_k: int = 5) -> list[dict]:
        if not self.client:
            return []

        result = self.client.search(
            collection_name=settings.qdrant_collection,
            query_vector=vector,
            query_filter=Filter(must=[FieldCondition(key="repository_id", match=MatchValue(value=repository_id))]),
            limit=top_k,
        )
        return [
            {
                "file_path": point.payload.get("file_path", ""),
                "chunk_text": point.payload.get("chunk", ""),
                "score": point.score,
            }
            for point in result
        ]

    @staticmethod
    def _point_id(repository_id: int, file_path: str, chunk: str) -> int:
        digest = hashlib.sha256(f"{repository_id}:{file_path}:{chunk}".encode("utf-8")).hexdigest()
        return int(digest[:16], 16)
