"""CRUD de categorias."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Category, CategoryType, Transaction, User
from schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


def _get_owned(db: Session, user: User, category_id: int) -> Category:
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada")
    return category


@router.get("", response_model=list[CategoryOut])
def list_categories(
    type: CategoryType | None = Query(default=None, description="Filtrar por income / expense"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Category]:
    query = db.query(Category).filter(Category.user_id == current_user.id)
    if type is not None:
        query = query.filter(Category.type == type)
    return query.order_by(Category.type, Category.name).all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Category:
    duplicated = (
        db.query(Category)
        .filter(
            Category.user_id == current_user.id,
            Category.name == payload.name.strip(),
            Category.type == payload.type,
        )
        .first()
    )
    if duplicated:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Ya existe una categoria con ese nombre"
        )
    category = Category(
        user_id=current_user.id,
        name=payload.name.strip(),
        icon=payload.icon,
        color=payload.color,
        type=payload.type,
        is_default=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Category:
    category = _get_owned(db, current_user, category_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        data["name"] = data["name"].strip()
    for field, value in data.items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    category = _get_owned(db, current_user, category_id)
    # Las transacciones se conservan, quedan como "Sin categoria".
    db.query(Transaction).filter(Transaction.category_id == category.id).update(
        {Transaction.category_id: None}, synchronize_session=False
    )
    db.delete(category)
    db.commit()
