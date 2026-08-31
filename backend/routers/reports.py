"""Reportes agregados: resumen, totales por categoria, historico y exportacion CSV."""
from __future__ import annotations

import calendar
import csv
import io
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user
from database import get_db
from models import Category, Transaction, TransactionType, User
from schemas import CategoryTotal, MonthPoint, SummaryOut

router = APIRouter(prefix="/reports", tags=["reports"])

Period = Literal["week", "month", "year"]

MONTH_LABELS = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]


def resolve_range(
    period: Period | None, start: date | None, end: date | None
) -> tuple[date, date]:
    """Devuelve el rango efectivo: las fechas explicitas mandan sobre el periodo."""
    today = date.today()
    if start and end:
        return (start, end) if start <= end else (end, start)
    if period == "week":
        first = today - timedelta(days=today.weekday())
        return start or first, end or first + timedelta(days=6)
    if period == "year":
        return start or date(today.year, 1, 1), end or date(today.year, 12, 31)
    # month (por defecto)
    last_day = calendar.monthrange(today.year, today.month)[1]
    return start or date(today.year, today.month, 1), end or date(today.year, today.month, last_day)


def _totals(db: Session, user: User, start: date, end: date) -> tuple[float, float, int]:
    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount), func.count(Transaction.id))
        .filter(
            Transaction.user_id == user.id,
            Transaction.date >= start,
            Transaction.date <= end,
        )
        .group_by(Transaction.type)
        .all()
    )
    income = expense = 0.0
    count = 0
    for tx_type, total, n in rows:
        count += n
        if tx_type == TransactionType.income:
            income = float(total or 0)
        elif tx_type == TransactionType.expense:
            expense = float(total or 0)
    return income, expense, count


@router.get("/summary", response_model=SummaryOut)
def summary(
    period: Period = "month",
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SummaryOut:
    start_d, end_d = resolve_range(period, start, end)
    income, expense, count = _totals(db, current_user, start_d, end_d)
    days = max(1, (end_d - start_d).days + 1)
    return SummaryOut(
        start=start_d,
        end=end_d,
        income=round(income, 2),
        expense=round(expense, 2),
        net=round(income - expense, 2),
        transactions=count,
        avg_daily_expense=round(expense / days, 2),
    )


@router.get("/by-category", response_model=list[CategoryTotal])
def by_category(
    start: date | None = None,
    end: date | None = None,
    period: Period = "month",
    type: TransactionType = TransactionType.expense,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CategoryTotal]:
    start_d, end_d = resolve_range(period, start, end)
    rows = (
        db.query(
            Transaction.category_id,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
            Category.name,
            Category.icon,
            Category.color,
        )
        .outerjoin(Category, Category.id == Transaction.category_id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == type,
            Transaction.date >= start_d,
            Transaction.date <= end_d,
        )
        .group_by(Transaction.category_id, Category.name, Category.icon, Category.color)
        .all()
    )
    grand_total = sum(float(r[1] or 0) for r in rows) or 1.0
    result = [
        CategoryTotal(
            category_id=cid,
            name=name or "Sin categoria",
            icon=icon or "\U0001F4CC",
            color=color or "#8D99AE",
            type=type,
            total=round(float(total or 0), 2),
            percentage=round(float(total or 0) / grand_total * 100, 1),
            count=count,
        )
        for cid, total, count, name, icon, color in rows
    ]
    return sorted(result, key=lambda c: c.total, reverse=True)


@router.get("/balance-history", response_model=list[MonthPoint])
def balance_history(
    months: int = Query(6, ge=1, le=36),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MonthPoint]:
    today = date.today()
    periods: list[tuple[int, int]] = []
    year, month = today.year, today.month
    for _ in range(months):
        periods.append((year, month))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    periods.reverse()

    window_start = date(periods[0][0], periods[0][1], 1)

    # Saldo acumulado antes de la ventana, para que la linea arranque en el punto correcto.
    prior = (
        db.query(Transaction.type, func.sum(Transaction.amount))
        .filter(Transaction.user_id == current_user.id, Transaction.date < window_start)
        .group_by(Transaction.type)
        .all()
    )
    cumulative = 0.0
    for tx_type, total in prior:
        if tx_type == TransactionType.income:
            cumulative += float(total or 0)
        elif tx_type == TransactionType.expense:
            cumulative -= float(total or 0)

    points: list[MonthPoint] = []
    for y, m in periods:
        last_day = calendar.monthrange(y, m)[1]
        income, expense, _ = _totals(db, current_user, date(y, m, 1), date(y, m, last_day))
        balance = income - expense
        cumulative += balance
        points.append(
            MonthPoint(
                year=y,
                month=m,
                label=MONTH_LABELS[m - 1] + " " + str(y)[2:],
                income=round(income, 2),
                expense=round(expense, 2),
                balance=round(balance, 2),
                cumulative=round(cumulative, 2),
            )
        )
    return points


@router.get("/export-csv")
def export_csv(
    start: date | None = None,
    end: date | None = None,
    period: Period = "month",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    start_d, end_d = resolve_range(period, start, end)
    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_d,
            Transaction.date <= end_d,
        )
        .order_by(Transaction.date.asc(), Transaction.id.asc())
        .all()
    )

    labels = {
        TransactionType.income: "Ingreso",
        TransactionType.expense: "Gasto",
        TransactionType.transfer: "Transferencia",
    }
    buffer = io.StringIO()
    buffer.write("﻿")  # BOM: Excel abre el CSV con acentos correctos
    writer = csv.writer(buffer)
    writer.writerow(["Fecha", "Tipo", "Categoria", "Descripcion", "Monto", "Nota"])
    for tx in transactions:
        writer.writerow(
            [
                tx.date.isoformat(),
                labels[tx.type],
                tx.category.name if tx.category else "Sin categoria",
                tx.description,
                format(float(tx.amount), ".2f"),
                tx.note or "",
            ]
        )
    filename = "finanzas_" + start_d.isoformat() + "_" + end_d.isoformat() + ".csv"
    disposition = "attachment; filename=" + chr(34) + filename + chr(34)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": disposition},
    )
