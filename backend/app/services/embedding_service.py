from __future__ import annotations

import hashlib
import json
import math
import os
import re
from collections import Counter
from pathlib import Path

import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.repository import EmbeddingMetadata, Repository
from app.services.code_parser_service import BINARY_SUFFIXES, EXTENSION_TO_LANGUAGE, IGNORED_DIRS
from app.services.vector_store_service import VectorStoreService

NON_EMBEDDABLE_EXTENSIONS = {
    # Tabular, raw dataset & data files
    ".csv", ".tsv", ".psv", ".parquet", ".feather", ".arrow",
    ".h5", ".hdf5", ".npy", ".npz", ".mat", ".dat", ".data",
    # Serialized models & weights
    ".pkl", ".pickle", ".pt", ".pth", ".onnx", ".weights", ".bin", ".model", ".joblib",
    # Databases & logs
    ".db", ".sqlite", ".sqlite3", ".log",
    # Package locks & minified files
    ".lock", ".map", ".min.js", ".min.css",
    # Binary suffixes
    *BINARY_SUFFIXES,
}

STOP_WORDS = {
    "what", "is", "are", "the", "a", "an", "how", "does", "where", "in", "on", "of",
    "for", "to", "this", "that", "these", "those", "which", "can", "you", "tell",
    "me", "about", "with", "used", "use", "using", "from", "and", "or", "by", "it",
    "at", "be", "do", "all", "any", "some"
}


def tokenize_code(text: str) -> list[str]:
    """Extracts code tokens splitting camelCase and snake_case."""
    raw_tokens = re.findall(r"[A-Za-z0-9_]+", text)
    tokens: list[str] = []
    for w in raw_tokens:
        subwords = w.split("_")
        for sw in subwords:
            camel_parts = re.findall(r"[A-Z]?[a-z0-9]+|[A-Z]+(?=[A-Z]|$)", sw)
            if camel_parts:
                for cp in camel_parts:
                    if len(cp) > 1:
                        tokens.append(cp.lower())
            elif len(sw) > 1:
                tokens.append(sw.lower())
    return tokens


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

                # Strictly skip non-embeddable data files (e.g., CSV, TSV, PKL, images)
                if ext in NON_EMBEDDABLE_EXTENSIONS:
                    continue

                rel = str(file_path.relative_to(base_path)).replace("\\", "/")
                parts = rel.split("/")
                if any(p in IGNORED_DIRS for p in parts):
                    continue

                # Skip non-code files inside data/datasets directories
                parent_dir = parts[0].lower() if len(parts) > 1 else ""
                if parent_dir in {"data", "dataset", "datasets"} and ext not in EXTENSION_TO_LANGUAGE:
                    continue

                # Skip oversized files (> 1MB)
                try:
                    if file_path.stat().st_size > 1_000_000:
                        continue
                    text = file_path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                if not text.strip():
                    continue

                chunks = self._chunk_text(text, chunk_size=45)
                # Cap maximum chunks per file to avoid drowning out other project files
                chunks = chunks[:35]

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
        # Clean any legacy non-code chunks (e.g. data/Dataset.csv) that may have been previously indexed
        self._purge_invalid_chunks(repository_id)

        rows = (
            self.db.query(EmbeddingMetadata)
            .filter(EmbeddingMetadata.repository_id == repository_id)
            .all()
        )
        if not rows:
            return []

        q_tokens = [t for t in tokenize_code(question) if t not in STOP_WORDS]
        q_lower = question.lower()
        query_vec = self._embed(question)

        # Build corpus DF for Okapi BM25
        doc_tokens_list: list[list[str]] = []
        df: Counter[str] = Counter()
        for row in rows:
            tks = [t for t in tokenize_code(row.chunk_text) if t not in STOP_WORDS]
            doc_tokens_list.append(tks)
            for unique_t in set(tks):
                df[unique_t] += 1

        N = len(rows)
        avg_dl = max(1.0, sum(len(d) for d in doc_tokens_list) / max(1, N))

        # Query intent expansions
        intent_terms: set[str] = set(q_tokens)
        if any(k in q_lower for k in ["pattern", "design", "architecture", "structure"]):
            intent_terms.update(["pipeline", "transformer", "regressor", "cache", "model", "clean", "feature", "utils", "app", "train", "class"])
        if any(k in q_lower for k in ["database", "db", "model", "storage", "table", "schema"]):
            intent_terms.update(["dataset", "csv", "load", "dataframe", "read", "model", "pkl", "joblib", "schema", "table", "base"])
        if any(k in q_lower for k in ["primary", "function", "entry", "main", "start", "run"]):
            intent_terms.update(["app", "streamlit", "predict", "delivery", "estimator", "main", "run"])
        if any(k in q_lower for k in ["train", "pipeline", "fit", "evaluate"]):
            intent_terms.update(["train", "pipeline", "fit", "regressor", "randomizedsearchcv", "cv", "mae", "rmse"])
        if any(k in q_lower for k in ["preprocess", "clean", "feature", "transform"]):
            intent_terms.update(["clean", "haversine", "distance", "encoder", "scaler", "imputer", "outlier"])

        scored: list[tuple[str, str, float]] = []
        k1 = 1.5
        b = 0.75

        for idx, row in enumerate(rows):
            doc_tokens = doc_tokens_list[idx]
            doc_len = len(doc_tokens)
            doc_text_lower = row.chunk_text.lower()
            file_lower = row.file_path.lower()

            bm25_score = 0.0
            for t in q_tokens:
                tf = doc_tokens.count(t)
                if tf > 0:
                    idf = math.log((N - df[t] + 0.5) / (df[t] + 0.5) + 1.0)
                    bm25_score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc_len / avg_dl)))

            intent_score = sum(0.5 for t in intent_terms if t in doc_tokens)

            # Path boost: if query token is in filename or parent folder
            path_boost = sum(3.5 for t in q_tokens if t in file_lower)

            # Definition boost
            def_boost = 1.2 if ("def " in row.chunk_text or "class " in row.chunk_text) else 0.0

            # Cosine similarity on feature hashing / embedding vector
            try:
                vec = np.array(json.loads(row.vector_json), dtype=float)
                norm = (np.linalg.norm(query_vec) * np.linalg.norm(vec)) + 1e-9
                cosine_sim = float(np.dot(query_vec, vec) / norm)
            except Exception:
                cosine_sim = 0.0

            total_score = (bm25_score * 3.0) + intent_score + path_boost + def_boost + (cosine_sim * 2.0)
            scored.append((row.file_path, row.chunk_text, total_score))

        scored.sort(key=lambda x: x[2], reverse=True)

        # Diversity re-ranking: allow at most 2 chunks per file to ensure balanced context
        results: list[tuple[str, str, float]] = []
        file_counts: Counter[str] = Counter()
        for item in scored:
            fpath = item[0]
            if file_counts[fpath] < 2 or len(results) < 2:
                results.append(item)
                file_counts[fpath] += 1
                if len(results) >= top_k:
                    break

        return results if results else scored[:top_k]

    def _purge_invalid_chunks(self, repository_id: int):
        """Purges any non-code data files (e.g. .csv) from the database."""
        try:
            non_code_patterns = [f"%{ext}" for ext in [".csv", ".tsv", ".pkl", ".png", ".jpg", ".zip", ".parquet"]]
            for pat in non_code_patterns:
                self.db.query(EmbeddingMetadata).filter(
                    EmbeddingMetadata.repository_id == repository_id,
                    EmbeddingMetadata.file_path.like(pat),
                ).delete(synchronize_session=False)
            self.db.commit()
        except Exception:
            self.db.rollback()

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 45) -> list[str]:
        lines = text.splitlines()
        chunks = []
        for i in range(0, len(lines), chunk_size):
            segment = "\n".join(lines[i : i + chunk_size]).strip()
            if segment:
                chunks.append(segment)
        return chunks

    @staticmethod
    def _hash_embedding(text: str, dim: int = 128) -> np.ndarray:
        """Computes sublinear term-frequency feature hashing vector."""
        tokens = [t for t in tokenize_code(text) if t not in STOP_WORDS]
        vec = np.zeros(dim, dtype=float)
        if not tokens:
            return vec

        counts = Counter(tokens)
        for token, count in counts.items():
            h_idx = int(hashlib.md5(token.encode("utf-8")).hexdigest()[:8], 16) % dim
            sign = 1.0 if (int(hashlib.sha1(token.encode("utf-8")).hexdigest()[:8], 16) % 2 == 1) else -1.0
            weight = 1.0 + math.log(count)
            vec[h_idx] += weight * sign

        norm = np.linalg.norm(vec) + 1e-9
        return vec / norm

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
