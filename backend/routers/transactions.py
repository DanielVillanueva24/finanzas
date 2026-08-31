"""CRUD, busqueda, filtros y paginacion de transacciones."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user
from database import get_db
from models import Category, Transaction, TransactionType, User
from schemas import TransactionCreate, TransactionOut, TransactionPage, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _validate_category(db: Session, user: User, category_id: int | None) -> None:
    if category_id is None:
        return
    exists = (
        db.query(Category.id)
        .filter(Category.id == category_id, Category.user_id == user.id)
        .first()
    )
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="La categoria no existe"
        )


def _get_owned(db: Session, user: User, transaction_id: int) -> Transaction:
    tx = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == user.id)
        .first()
    )
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaccion no encontrada"
        )
    return tx


@router.get("", response_model=TransactionPage)
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: TransactionType | None = None,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TransactionPage:
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.user_id == current_user.id)
    )
    if type is not None:
        query = query.filter(Transaction.type == type)
    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)
    if start_date is not None:
        query = query.filter(Transaction.date >= start_date)
    if end_date is not None:
        query = query.filter(Transaction.date <= end_date)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(Transaction.description.ilike(pattern), Transaction.note.ilike(pattern))
        )

    total = query.count()
    items = (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    pages = max(1, -(-total // limit))
    return TransactionPage(items=items, total=total, page=page, limit=limit, pages=pages)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    _validate_category(db, current_user, payload.category_id)
    tx = Transaction(user_id=current_user.id, **payload.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    return _get_owned(db, current_user, transaction_id)


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    tx = _get_owned(db, current_user, transaction_id)
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        _validate_category(db, current_user, data["category_id"])
    if "amount" in data and data["amount"] is not None:
        data["amount"] = round(data["amount"], 2)
    for field, value in data.items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    tx = _get_owned(db, current_user, transaction_id)
    db.delete(tx)
    db.commit()
