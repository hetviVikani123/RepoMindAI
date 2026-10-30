from __future__ import annotations

import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.repository import AnalysisHistory, ChatHistory, EmbeddingMetadata, Repository, User

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
            "repository_count": len(u.repositories),
            "repositories": [
                {
                    "id": r.id,
                    "name": r.name,
                    "url": r.url,
                    "language": r.language,
                    "created_at": r.created_at.isoformat(),
                }
                for r in u.repositories
            ],
        }
        for u in users
    ]


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    new_role = payload.get("role", "").lower()
    if new_role not in ("developer", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be developer or admin.")
    target.role = new_role
    db.commit()
    return {"id": target.id, "email": target.email, "role": target.role}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(target)
    db.commit()
    return {"status": "deleted", "user_id": user_id}


@router.get("/repositories")
def list_all_repositories(db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    """Returns all uploaded repositories joined with user/owner audit details."""
    repos = db.query(Repository).order_by(Repository.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "url": r.url,
            "local_path": r.local_path,
            "language": r.language,
            "framework": r.framework,
            "build_system": r.build_system,
            "created_at": r.created_at.isoformat(),
            "owner_id": r.owner_id,
            "owner_email": r.owner.email if r.owner else "Unknown",
            "owner_role": r.owner.role if r.owner else "Unknown",
            "file_count": len(r.files),
        }
        for r in repos
    ]


@router.delete("/repositories/{repo_id}")
def delete_repository(repo_id: int, db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    """Allows an administrator to delete a malicious or unauthorized repository."""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Remove cloned/copied local directory on disk if it exists
    try:
        if repo.local_path and Path(repo.local_path).exists():
            shutil.rmtree(repo.local_path, ignore_errors=True)
    except Exception:
        pass

    # Purge embeddings & chat history for this repository
    db.query(EmbeddingMetadata).filter(EmbeddingMetadata.repository_id == repo_id).delete(synchronize_session=False)
    db.query(ChatHistory).filter(ChatHistory.repository_id == repo_id).delete(synchronize_session=False)

    db.delete(repo)
    db.commit()
    return {"status": "deleted", "repository_id": repo_id}


@router.get("/stats")
def system_stats(db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    total_users = db.query(User).count()
    total_repos = db.query(Repository).count()
    total_embeddings = db.query(EmbeddingMetadata).count()
    total_analyses = db.query(AnalysisHistory).count()
    return {
        "total_users": total_users,
        "total_repositories": total_repos,
        "total_embeddings": total_embeddings,
        "total_analyses": total_analyses,
    }


@router.get("/logs")
def analysis_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    logs = (
        db.query(AnalysisHistory)
        .order_by(AnalysisHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "repository_id": log.repository_id,
            "report_type": log.report_type,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

