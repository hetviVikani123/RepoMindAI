from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_roles
from app.core.database import get_db, SessionLocal
from app.models.repository import AnalysisHistory, Repository, User
from app.models.repository import PipelineStage
from app.schemas.repository import AnalysisResponse, ChatRequest, ChatResponse, DocumentationResponse, PipelineStatusResponse, RepositoryImportRequest, RepositoryResponse
from app.services.analysis_service import AnalysisService
from app.services.chat_service import ChatService
from app.services.code_parser_service import CodeParserService
from app.services.dependency_service import DependencyService
from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService
from app.services.repository_service import RepositoryService
from app.services.uml_service import UMLService
from app.services.analysis_service import PIPELINE_STAGES


router = APIRouter()


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

    existing_stage_names = {
        stage.stage_name for stage in db.query(PipelineStage).filter(PipelineStage.repository_id == repo.id).all()
    }
    for stage_name in PIPELINE_STAGES:
        if stage_name not in existing_stage_names:
            db.add(PipelineStage(repository_id=repo.id, stage_name=stage_name, status="pending", message="Queued for analysis"))
    db.commit()

    # Run indexing and parsing tasks asynchronously so the API returns quickly.
    def _background_index(repo_id: int, local_path: str):
        # create a fresh DB session for background work
        db_bg = SessionLocal()
        try:
            # refresh repo object
            repo_obj = db_bg.query(Repository).filter(Repository.id == repo_id).first()
            if not repo_obj:
                return
            try:
                EmbeddingService(db_bg).index_repository(repo_obj)
            except Exception:
                pass
            try:
                parsed = CodeParserService.parse_repository(repo_obj.local_path)
                GraphService().index_symbols(repo_obj.id, parsed.get("symbols", []))
                GraphService().index_dependencies(repo_obj.id, parsed.get("dependencies", []))
            except Exception:
                pass
        finally:
            db_bg.close()

    # schedule background task via FastAPI BackgroundTasks so it runs after response
    if background_tasks is not None:
        background_tasks.add_task(_background_index, repo.id, repo.local_path)
    return repo



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

    parsed = CodeParserService.parse_repository(repo.local_path)
    result = UMLService.generate(repo.local_path)
    result["mermaid"] = CodeParserService.to_mermaid(parsed["symbols"], parsed["dependencies"])
    result["symbols"] = parsed["symbols"][:300]
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
    result["cytoscape_elements"] = CodeParserService.to_cytoscape(parsed["dependencies"])
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
    user: User = Depends(require_roles("analyst", "admin")),
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
    user: User = Depends(require_roles("analyst", "admin")),
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
        raise HTTPException(status_code=404, detail="No report available")

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
