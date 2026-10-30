from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_routes import router as admin_router
from app.api.auth_routes import router as auth_router
from app.api.routes import router
from app.core.config import settings
from app.core.database import Base, engine


def _init_db_and_seed():
    """Initializes tables and seeds/syncs the default admin user on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        from app.core.database import SessionLocal
        from app.models.repository import User
        from app.services.auth_service import pwd_context, _prepare_password

        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.email == "admin@gmail.com").first()
            if not admin_user:
                admin_user = User(
                    email="admin@gmail.com",
                    password_hash=pwd_context.hash(_prepare_password("admin@123")),
                    role="admin",
                )
                db.add(admin_user)
                db.commit()
            else:
                admin_user.password_hash = pwd_context.hash(_prepare_password("admin@123"))
                admin_user.role = "admin"
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
    except Exception:
        pass


_init_db_and_seed()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}
