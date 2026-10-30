from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.repository import User, UserSession


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _verify_password_hash(stored_hash: str, password: str) -> bool:
    """Verify password against stored hash.
    Prefer `pwd_context` (pbkdf2). If that fails, try bcrypt directly (if available).
    Any exceptions are caught and treated as verification failure.
    """
    try:
        if pwd_context.verify(_prepare_password(password), stored_hash):
            return True
    except Exception:
        pass

    # Fallback: try bcrypt directly if package is available
    try:
        import bcrypt as _bcrypt

        return _bcrypt.checkpw(_prepare_password(password).encode("utf-8"), stored_hash.encode("utf-8"))
    except Exception:
        return False


def _prepare_password(password: str) -> str:
    """Pre-hash the password with SHA-256 so it always fits within bcrypt's
    72-byte limit, regardless of the original password length."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, email: str, password: str, role: str) -> User:
        clean_role = (role or "developer").lower().strip()
        if clean_role not in ("developer", "admin"):
            raise ValueError("Invalid role. Only 'developer' and 'admin' roles are supported.")
        if self.db.query(User).filter(User.email == email).first():
            raise ValueError("Email already registered")

        user = User(email=email, password_hash=pwd_context.hash(_prepare_password(password)), role=clean_role)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def login(self, email: str, password: str) -> tuple[str, str, int]:
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not _verify_password_hash(user.password_hash, password):
            raise ValueError("Invalid credentials")

        # If the stored hash uses an older algorithm, re-hash with the preferred scheme.
        try:
            if pwd_context.needs_update(user.password_hash):
                user.password_hash = pwd_context.hash(_prepare_password(password))
                self.db.add(user)
                self.db.commit()
        except Exception:
            # ignore rehash failures — allow login to proceed
            pass

        refresh_token = secrets.token_urlsafe(48)
        refresh_hash = self._hash_token(refresh_token)
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

        session = UserSession(user_id=user.id, refresh_token_hash=refresh_hash, expires_at=expires_at, is_revoked=0)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        access_token = self._create_access_token(user.id, user.role, session.id)
        return access_token, refresh_token, settings.access_token_expire_minutes * 60

    def refresh(self, refresh_token: str) -> tuple[str, str, int]:
        refresh_hash = self._hash_token(refresh_token)
        session = self.db.query(UserSession).filter(UserSession.refresh_token_hash == refresh_hash).first()
        if not session or session.is_revoked or session.expires_at < datetime.utcnow():
            raise ValueError("Invalid refresh token")

        user = self.db.query(User).filter(User.id == session.user_id).first()
        if not user:
            raise ValueError("User not found")

        session.is_revoked = 1
        self.db.add(session)

        new_refresh_token = secrets.token_urlsafe(48)
        new_session = UserSession(
            user_id=user.id,
            refresh_token_hash=self._hash_token(new_refresh_token),
            expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
            is_revoked=0,
        )
        self.db.add(new_session)
        self.db.commit()
        self.db.refresh(new_session)

        access_token = self._create_access_token(user.id, user.role, new_session.id)
        return access_token, new_refresh_token, settings.access_token_expire_minutes * 60

    def logout(self, refresh_token: str):
        refresh_hash = self._hash_token(refresh_token)
        session = self.db.query(UserSession).filter(UserSession.refresh_token_hash == refresh_hash).first()
        if session:
            session.is_revoked = 1
            self.db.add(session)
            self.db.commit()

    def get_current_user_from_token(self, token: str) -> User:
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            user_id = int(payload.get("sub"))
            session_id = int(payload.get("sid"))
        except (JWTError, TypeError, ValueError) as exc:
            raise ValueError("Invalid token") from exc

        session = self.db.query(UserSession).filter(UserSession.id == session_id).first()
        if not session or session.is_revoked or session.expires_at < datetime.utcnow():
            raise ValueError("Session invalid or expired")

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        return user

    def _create_access_token(self, user_id: int, role: str, session_id: int) -> str:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        to_encode = {
            "sub": str(user_id),
            "role": role,
            "sid": str(session_id),
            "exp": expire,
        }
        return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
