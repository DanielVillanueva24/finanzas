"""Hash de contrasenas, emision/validacion de JWT y dependencias de sesion."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User

# passlib 1.7.4 lee bcrypt.__about__.__version__, que bcrypt >= 4.1 ya no expone.
if not hasattr(_bcrypt, "__about__"):  # pragma: no cover - shim de compatibilidad
    class _About:
        __version__ = getattr(_bcrypt, "__version__", "4.2.1")

    _bcrypt.__about__ = _About()  # type: ignore[attr-defined]

from passlib.context import CryptContext  # noqa: E402  (debe ir tras el shim)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login-form", auto_error=False)

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No autenticado o token invalido",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    # bcrypt trunca a 72 bytes; cortamos antes para evitar el error de passlib.
    return pwd_context.hash(password[:72])


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain[:72], hashed)
    except ValueError:
        return False


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str | None = payload.get("sub")
    except JWTError:
        raise credentials_exception from None
    if not username:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
