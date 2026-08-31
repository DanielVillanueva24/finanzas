"""Endpoints de registro, inicio de sesion y perfil."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, hash_password, verify_password
from database import get_db
from defaults import create_default_categories
from models import User
from schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _authenticate(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username.strip().lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario o contrasena incorrectos"
        )
    return user


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    exists = db.query(User).filter(User.username == payload.username).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ese usuario ya esta registrado"
        )
    user = User(
        username=payload.username,
        full_name=payload.full_name or payload.username.capitalize(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()  # necesitamos el id para las categorias
    create_default_categories(db, user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.username), user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = _authenticate(db, payload.username, payload.password)
    return Token(access_token=create_access_token(user.username), user=UserOut.model_validate(user))


@router.post("/login-form", response_model=Token, include_in_schema=False)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    """Compatibilidad con el boton Authorize de /docs."""
    user = _authenticate(db, form.username, form.password)
    return Token(access_token=create_access_token(user.username), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
