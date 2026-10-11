from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


# Normalize sqlite url to absolute backend database path if relative
db_url = settings.database_url
if db_url.startswith("sqlite:///./") or db_url == "sqlite:///repomind.db":
    backend_db = Path(__file__).resolve().parents[2] / "repomind.db"
    db_url = f"sqlite:///{backend_db.as_posix()}"

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
