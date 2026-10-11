from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.repository import ChatHistory, Repository, RepositoryFile
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
            # Attempt on-demand indexing if index was empty
            try:
                self.embedding.index_repository(repo)
                matches = self.embedding.search(repository_id, question, top_k=5)
            except Exception:
                pass

        if not matches:
            files = (
                self.db.query(RepositoryFile)
                .filter(RepositoryFile.repository_id == repository_id)
                .limit(15)
                .all()
            )
            if files:
                file_list_str = "\n".join(f"- {f.file_path} ({f.language or 'text'})" for f in files)
                excerpts = f"[Repository Overview]\nName: {repo.name}\nLanguage: {repo.language}\nFramework: {repo.framework}\nFiles:\n{file_list_str}"
                citations = [f.file_path for f in files[:3]]
                answer = ProviderService.generate_answer(question=question, context=excerpts)
            else:
                answer = "No indexed context found for this repository yet. Please run full analysis in Analysis Progress."
                citations = []
        else:
            citations = sorted(set(m[0] for m in matches))
            excerpts = "\n\n".join(f"[{m[0]}]\n{m[1][:600]}" for m in matches)
            answer = ProviderService.generate_answer(question=question, context=excerpts)

        self.db.add(ChatHistory(repository_id=repository_id, question=question, answer=answer))
        self.db.commit()
        return answer, citations
