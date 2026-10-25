from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


# Normalize database URL
db_url = settings.database_url
if db_url.startswith("postgres://"):
    # SQLAlchemy requires postgresql:// instead of postgres://
    db_url = db_url.replace("postgres://", "postgresql://", 1)
elif db_url.startswith("sqlite:///./") or db_url == "sqlite:///repomind.db":
    backend_db = Path(__file__).resolve().parents[2] / "repomind.db"
    db_url = f"sqlite:///{backend_db.as_posix()}"

# Neon PostgreSQL connection settings
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
engine_kwargs: dict = {
    "connect_args": connect_args,
    "pool_pre_ping": True,  # Critical for Neon serverless auto-suspend / sleep reconnects
}

if not db_url.startswith("sqlite"):
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 300,
    })

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
