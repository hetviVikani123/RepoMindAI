from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.repository import ChatHistory, Repository
from app.services.embedding_service import EmbeddingService
from app.services.provider_service import ProviderService


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.embedding = EmbeddingService(db)

    def ask(self, repository_id: int, question: str) -> tuple[str, list[str]]:
        repo = self.db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            return "Repository not found.", []

        matches = self.embedding.search(repository_id, question, top_k=5)
        if not matches:
            answer = "No indexed context found for this repository yet. Importing succeeded, but embedding index is empty."
            citations = []
        else:
            citations = sorted(set(m[0] for m in matches))
            excerpts = "\n\n".join(f"[{m[0]}]\n{m[1][:600]}" for m in matches)
            answer = ProviderService.generate_answer(question=question, context=excerpts)

        self.db.add(ChatHistory(repository_id=repository_id, question=question, answer=answer))
        self.db.commit()
        return answer, citations
