from __future__ import annotations

from dataclasses import dataclass


@dataclass
class VectorChunk:
    file_path: str
    symbol: str
    embedding: list[float]


class InMemoryVectorStore:
    def __init__(self):
        self._items: list[VectorChunk] = []

    def add(self, item: VectorChunk):
        self._items.append(item)

    def list_items(self) -> list[VectorChunk]:
        return self._items
