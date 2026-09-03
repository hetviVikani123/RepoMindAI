from app.core.database import Base, engine, SessionLocal
from app.models.repository import User
from app.services.auth_service import _prepare_password, pwd_context


def create_user(email: str, password: str, role: str = "developer"):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"User already exists: {email}")
            return
        user = User(email=email, password_hash=pwd_context.hash(_prepare_password(password)), role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user id={user.id} email={user.email}")
    finally:
        db.close()


if __name__ == "__main__":
    create_user("cli_test@example.com", "password", "developer")
