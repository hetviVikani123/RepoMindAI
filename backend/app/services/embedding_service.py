from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.repository import EmbeddingMetadata, Repository
from app.services.code_parser_service import BINARY_SUFFIXES, IGNORED_DIRS
from app.services.vector_store_service import VectorStoreService


class EmbeddingService:
    def __init__(self, db: Session):
        self.db = db
        self.vector_store = None if settings.local_only else VectorStoreService()

    def index_repository(self, repo: Repository) -> int:
        base_path = Path(repo.local_path)
        if not base_path.exists() or not base_path.is_dir():
            return 0

        # Clear existing embeddings for this repository to prevent duplicates on re-index
        self.db.query(EmbeddingMetadata).filter(EmbeddingMetadata.repository_id == repo.id).delete()
        inserted = 0

        for root, dirs, files in os.walk(base_path):
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".git")]

            for file_name in files:
                file_path = Path(root) / file_name
                ext = file_path.suffix.lower()
                if ext in BINARY_SUFFIXES:
                    continue

                rel = str(file_path.relative_to(base_path)).replace("\\", "/")
                parts = rel.split("/")
                if any(p in IGNORED_DIRS for p in parts):
                    continue

                try:
                    text = file_path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                if not text.strip():
                    continue

                chunks = self._chunk_text(text)
                for chunk in chunks:
                    vec = self._embed(chunk)
                    row = EmbeddingMetadata(
                        repository_id=repo.id,
                        file_path=rel,
                        chunk_text=chunk,
                        vector_json=json.dumps(vec.tolist()),
                    )
                    self.db.add(row)
                    if self.vector_store:
                        try:
                            self.vector_store.upsert(repo.id, rel, chunk, vec.tolist())
                        except Exception:
                            pass
                    inserted += 1

        self.db.commit()
        return inserted

    def search(self, repository_id: int, question: str, top_k: int = 5) -> list[tuple[str, str, float]]:
        query_vec = self._embed(question)

        qdrant_hits = (
            self.vector_store.search(repository_id, query_vec.tolist(), top_k=top_k)
            if self.vector_store
            else []
        )
        if qdrant_hits:
            return [(h["file_path"], h["chunk_text"], float(h["score"])) for h in qdrant_hits]

        rows = (
            self.db.query(EmbeddingMetadata)
            .filter(EmbeddingMetadata.repository_id == repository_id)
            .all()
        )
        if not rows:
            return []

        scored = []
        for row in rows:
            vec = np.array(json.loads(row.vector_json), dtype=float)
            norm = (np.linalg.norm(query_vec) * np.linalg.norm(vec)) + 1e-9
            score = float(np.dot(query_vec, vec) / norm)
            scored.append((row.file_path, row.chunk_text, score))

        scored.sort(key=lambda x: x[2], reverse=True)
        return scored[:top_k]

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 50) -> list[str]:
        lines = text.splitlines()
        chunks = []
        for i in range(0, len(lines), chunk_size):
            segment = "\n".join(lines[i : i + chunk_size]).strip()
            if segment:
                chunks.append(segment)
        return chunks

    @staticmethod
    def _hash_embedding(text: str, dim: int = 64) -> np.ndarray:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        arr = np.frombuffer((digest * ((dim // len(digest)) + 1))[:dim], dtype=np.uint8).astype(float)
        norm = np.linalg.norm(arr) + 1e-9
        return arr / norm

    @staticmethod
    def _openai_embedding(text: str) -> np.ndarray:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        response = client.embeddings.create(model="text-embedding-3-small", input=text)
        return np.array(response.data[0].embedding, dtype=float)

    def _embed(self, text: str) -> np.ndarray:
        if settings.local_only:
            return self._hash_embedding(text)

        provider = settings.embedding_provider.lower()
        if provider == "openai" and settings.openai_api_key:
            try:
                return self._openai_embedding(text)
            except Exception:
                return self._hash_embedding(text)
        return self._hash_embedding(text)
