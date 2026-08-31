"""Presupuestos mensuales por categoria, con renovacion automatica cada mes."""
from __future__ import annotations

import calendar
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user
from database import get_db
from models import Budget, Category, CategoryType, Transaction, TransactionType, User
from schemas import BudgetCreate, BudgetOut, BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["budgets"])


def month_range(year: int, month: int) -> tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _renew_from_previous(db: Session, user: User, year: int, month: int) -> None:
    """Si el mes pedido no tiene presupuestos, copia los recurrentes del ultimo mes que si tenga."""
    has_current = (
        db.query(Budget.id)
        .filter(Budget.user_id == user.id, Budget.year == year, Budget.month == month)
        .first()
    )
    if has_current:
        return

    period = year * 12 + month
    previous = (
        db.query(Budget)
        .filter(Budget.user_id == user.id, Budget.recurring.is_(True))
        .filter((Budget.year * 12 + Budget.month) < period)
        .order_by((Budget.year * 12 + Budget.month).desc())
        .all()
    )
    if not previous:
        return

    latest_period = max(b.year * 12 + b.month for b in previous)
    for budget in previous:
        if budget.year * 12 + budget.month != latest_period:
            continue
        db.add(
            Budget(
                user_id=user.id,
                category_id=budget.category_id,
                amount=budget.amount,
                year=year,
                month=month,
                recurring=True,
            )
        )
    db.commit()


def _spent_by_category(db: Session, user: User, year: int, month: int) -> dict[int, float]:
    start, end = month_range(year, month)
    rows = (
        db.query(Transaction.category_id, func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.expense,
            Transaction.date >= start,
            Transaction.date <= end,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    return {cid: float(total or 0) for cid, total in rows if cid is not None}


def _to_out(budget: Budget, spent: float) -> BudgetOut:
    amount = float(budget.amount)
    percentage = round(spent / amount * 100, 1) if amount else 0.0
    if percentage >= 100:
        state = "exceeded"
    elif percentage >= 80:
        state = "warning"
    else:
        state = "ok"
    out = BudgetOut.model_validate(budget)
    out.spent = round(spent, 2)
    out.remaining = round(amount - spent, 2)
    out.percentage = percentage
    out.status = state
    return out


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    year: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    month: int = Query(default_factory=lambda: date.today().month, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BudgetOut]:
    _renew_from_previous(db, current_user, year, month)
    budgets = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.user_id == current_user.id, Budget.year == year, Budget.month == month)
        .join(Category)
        .order_by(Category.name)
        .all()
    )
    spent = _spent_by_category(db, current_user, year, month)
    return [_to_out(b, spent.get(b.category_id, 0.0)) for b in budgets]


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetOut:
    category = (
        db.query(Category)
        .filter(Category.id == payload.category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La categoria no existe")
    if category.type != CategoryType.expense:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden presupuestar categorias de gasto",
        )
    duplicated = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == payload.category_id,
            Budget.year == payload.year,
            Budget.month == payload.month,
        )
        .first()
    )
    if duplicated:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un presupuesto de esa categoria para ese mes",
        )
    budget = Budget(user_id=current_user.id, **payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    spent = _spent_by_category(db, current_user, budget.year, budget.month)
    return _to_out(budget, spent.get(budget.category_id, 0.0))


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetOut:
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado"
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)
    spent = _spent_by_category(db, current_user, budget.year, budget.month)
    return _to_out(budget, spent.get(budget.category_id, 0.0))


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Presupuesto no encontrado"
        )
    db.delete(budget)
    db.commit()
