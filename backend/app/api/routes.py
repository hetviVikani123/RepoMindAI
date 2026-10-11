from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_roles
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.models.repository import AnalysisHistory, PipelineStage, Repository, User
from app.schemas.repository import (
    AnalysisResponse,
    ChatRequest,
    ChatResponse,
    DocumentationResponse,
    PipelineStatusResponse,
    RepositoryImportRequest,
    RepositoryResponse,
)
from app.services.analysis_service import PIPELINE_STAGES, AnalysisService
from app.services.chat_service import ChatService
from app.services.code_parser_service import CodeParserService
from app.services.dependency_service import DependencyService
from app.services.repository_service import RepositoryService
from app.services.uml_service import UMLService


router = APIRouter()


def _run_pipeline_bg(repo_id: int):
    """Worker function for executing the pipeline in the background."""
    db_bg = SessionLocal()
    try:
        AnalysisService.run_pipeline(repo_id, db_bg)
    finally:
        db_bg.close()


@router.post("/repository/import", response_model=RepositoryResponse)
def import_repository(
    payload: RepositoryImportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    service = RepositoryService(db)
    try:
        repo = service.import_repository(str(payload.url), owner_id=user.id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to import repository: {exc}") from exc

    # Seed all pipeline stages as pending
    existing_stage_names = {
        stage.stage_name for stage in db.query(PipelineStage).filter(PipelineStage.repository_id == repo.id).all()
    }
    for stage_name in PIPELINE_STAGES:
        if stage_name not in existing_stage_names:
            db.add(PipelineStage(repository_id=repo.id, stage_name=stage_name, status="pending", message="Queued for analysis"))
    db.commit()

    # Launch background pipeline immediately
    if background_tasks is not None:
        background_tasks.add_task(_run_pipeline_bg, repo.id)
    else:
        import threading
        t = threading.Thread(target=_run_pipeline_bg, args=(repo.id,), daemon=True)
        t.start()

    return repo


@router.post("/repository/{repository_id}/analyze")
def trigger_analysis(
    repository_id: int,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Triggers or re-runs the full analysis pipeline for a repository."""
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Reset stages to pending
    for stage_name in PIPELINE_STAGES:
        st = db.query(PipelineStage).filter(PipelineStage.repository_id == repo.id, PipelineStage.stage_name == stage_name).first()
        if st:
            st.status = "pending"
            st.message = "Queued for analysis"
            st.started_at = None
            st.completed_at = None
        else:
            db.add(PipelineStage(repository_id=repo.id, stage_name=stage_name, status="pending", message="Queued for analysis"))
    db.commit()

    if background_tasks is not None:
        background_tasks.add_task(_run_pipeline_bg, repo.id)
    else:
        import threading
        t = threading.Thread(target=_run_pipeline_bg, args=(repo.id,), daemon=True)
        t.start()

    return {"status": "started", "repository_id": repo.id}


@router.get("/repository/{repository_id}", response_model=RepositoryResponse)
def get_repository(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _repo = db.query(Repository).filter(Repository.id == payload.repository_id, Repository.owner_id == user.id).first()
    if not _repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    answer, citations = ChatService(db).ask(payload.repository_id, payload.question)
    return ChatResponse(answer=answer, citations=citations)


@router.get("/uml", response_model=AnalysisResponse)
def get_uml(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = UMLService.generate(repo.local_path)
    _save_report(db, repo.id, "uml", result)
    return AnalysisResponse(repository_id=repo.id, report_type="uml", result=result)


@router.get("/dependencies", response_model=AnalysisResponse)
def get_dependencies(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    parsed = CodeParserService.parse_repository(repo.local_path)
    result = DependencyService.generate_dependency_report(repo.local_path)
    result["parsed_dependencies"] = parsed["dependencies"][:1000]
    result["cytoscape_elements"] = CodeParserService.to_cytoscape(parsed["files"], parsed["dependencies"])
    _save_report(db, repo.id, "dependencies", result)
    return AnalysisResponse(repository_id=repo.id, report_type="dependencies", result=result)


@router.get("/technical-debt", response_model=AnalysisResponse)
def get_technical_debt(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = AnalysisService.technical_debt(repo.local_path)
    _save_report(db, repo.id, "technical_debt", result)
    return AnalysisResponse(repository_id=repo.id, report_type="technical_debt", result=result)


@router.get("/architecture", response_model=AnalysisResponse)
def get_architecture(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = AnalysisService.architecture(repo.local_path)
    _save_report(db, repo.id, "architecture", result)
    return AnalysisResponse(repository_id=repo.id, report_type="architecture", result=result)


@router.get("/security", response_model=AnalysisResponse)
def get_security(
    repository_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("developer", "analyst", "admin")),
):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = AnalysisService.security(repo.local_path)
    _save_report(db, repo.id, "security", result)
    return AnalysisResponse(repository_id=repo.id, report_type="security", result=result)


@router.get("/report", response_model=AnalysisResponse)
def get_report(
    repository_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("developer", "analyst", "admin")),
):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    latest = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.repository_id == repository_id)
        .order_by(AnalysisHistory.created_at.desc())
        .first()
    )
    if not latest:
        # Run static analysis to generate immediate report
        debt = AnalysisService.technical_debt(repo.local_path)
        sec = AnalysisService.security(repo.local_path)
        arch = AnalysisService.architecture(repo.local_path)
        combined = {"technical_debt": debt, "security": sec, "architecture": arch}
        _save_report(db, repo.id, "summary", combined)
        return AnalysisResponse(repository_id=repository_id, report_type="summary", result=combined)

    return AnalysisResponse(repository_id=repository_id, report_type=latest.report_type, result=json.loads(latest.report_json))


def _save_report(db: Session, repository_id: int, report_type: str, result: dict):
    db.add(AnalysisHistory(repository_id=repository_id, report_type=report_type, report_json=json.dumps(result)))
    db.commit()


@router.get("/repository/{repository_id}/pipeline-status", response_model=PipelineStatusResponse)
def pipeline_status(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    stages = db.query(PipelineStage).filter(PipelineStage.repository_id == repository_id).order_by(PipelineStage.id.asc()).all()
    return PipelineStatusResponse(repository_id=repository_id, stages=stages)


@router.get("/documentation", response_model=DocumentationResponse)
def get_documentation(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = AnalysisService.generate_documentation(repo.local_path, repo.name, repo.language, repo.framework)
    _save_report(db, repo.id, "documentation", result)
    return DocumentationResponse(repository_id=repo.id, **result)


@router.get("/repository/{repository_id}/status")
def repository_status(repository_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repository_id, Repository.owner_id == user.id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    from app.models.repository import EmbeddingMetadata

    count = db.query(EmbeddingMetadata).filter(EmbeddingMetadata.repository_id == repository_id).count()
    return {"repository_id": repository_id, "embeddings": count, "indexed": count > 0}


# ==========================================
# Settings & AI Configuration Endpoints
# ==========================================

@router.get("/settings")
def get_settings():
    return {
        "llm_provider": settings.llm_provider,
        "embedding_provider": settings.embedding_provider,
        "openai_model": settings.openai_model,
        "gemini_model": settings.gemini_model,
        "groq_model": settings.groq_model,
        "claude_model": settings.claude_model,
        "ollama_base_url": settings.ollama_base_url,
        "ollama_model": settings.ollama_model,
        "local_only": settings.local_only,
        "has_google_key": bool(settings.google_api_key),
        "has_openai_key": bool(settings.openai_api_key),
        "has_anthropic_key": bool(settings.anthropic_api_key),
        "has_groq_key": bool(settings.groq_api_key),
    }


@router.post("/settings")
def update_settings(payload: dict):
    if "llm_provider" in payload and payload["llm_provider"]:
        settings.llm_provider = str(payload["llm_provider"]).lower()
    if "google_api_key" in payload and payload["google_api_key"]:
        settings.google_api_key = str(payload["google_api_key"]).strip()
    if "openai_api_key" in payload and payload["openai_api_key"]:
        settings.openai_api_key = str(payload["openai_api_key"]).strip()
    if "anthropic_api_key" in payload and payload["anthropic_api_key"]:
        settings.anthropic_api_key = str(payload["anthropic_api_key"]).strip()
    if "groq_api_key" in payload and payload["groq_api_key"]:
        settings.groq_api_key = str(payload["groq_api_key"]).strip()
    if "gemini_model" in payload and payload["gemini_model"]:
        settings.gemini_model = str(payload["gemini_model"]).strip()
    if "openai_model" in payload and payload["openai_model"]:
        settings.openai_model = str(payload["openai_model"]).strip()
    if "local_only" in payload:
        settings.local_only = bool(payload["local_only"])

    # Persist changes to backend/.env
    _persist_env()

    return {"status": "ok", "settings": get_settings()}


@router.post("/settings/test")
def test_ai_settings():
    from app.services.provider_service import ProviderService
    try:
        ans = ProviderService.generate_answer(
            "Say hello from RepoMind AI and verify AI reasoning is active in 1 short sentence.",
            "[system/status]\nRepoMind AI platform online.",
        )
        return {"status": "ok", "response": ans}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


def _persist_env():
    """Writes updated configuration to backend/.env safely."""
    try:
        env_path = Path(__file__).resolve().parents[2] / ".env"
        lines = [
            f"LOCAL_ONLY={'true' if settings.local_only else 'false'}",
            f"DATABASE_URL={settings.database_url}",
            f"JWT_SECRET={settings.jwt_secret}",
            f"JWT_ALGORITHM={settings.jwt_algorithm}",
            f"ACCESS_TOKEN_EXPIRE_MINUTES={settings.access_token_expire_minutes}",
            f"REFRESH_TOKEN_EXPIRE_DAYS={settings.refresh_token_expire_days}",
            f"LLM_PROVIDER={settings.llm_provider}",
            f"EMBEDDING_PROVIDER={settings.embedding_provider}",
            f"OPENAI_API_KEY={settings.openai_api_key or ''}",
            f"GOOGLE_API_KEY={settings.google_api_key or ''}",
            f"ANTHROPIC_API_KEY={settings.anthropic_api_key or ''}",
            f"GROQ_API_KEY={settings.groq_api_key or ''}",
            f"QDRANT_URL={settings.qdrant_url or ''}",
            f"QDRANT_API_KEY={settings.qdrant_api_key or ''}",
            f"QDRANT_COLLECTION={settings.qdrant_collection}",
            f"NEO4J_URI={settings.neo4j_uri or ''}",
            f"NEO4J_USERNAME={settings.neo4j_username}",
            f"NEO4J_PASSWORD={settings.neo4j_password or ''}",
            f"OPENAI_MODEL={settings.openai_model}",
            f"GEMINI_MODEL={settings.gemini_model}",
            f"GROQ_MODEL={settings.groq_model}",
        ]
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except Exception:
        pass
