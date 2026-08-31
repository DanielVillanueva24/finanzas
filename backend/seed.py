"""Datos de prueba: usuario demo con categorias, transacciones y presupuestos."""
from __future__ import annotations

import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from auth import hash_password
from database import SessionLocal
from defaults import create_default_categories
from models import Budget, Category, CategoryType, Transaction, TransactionType, User

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demo1234"

# (categoria, descripcion, monto minimo, monto maximo, cuantas al mes)
EXPENSE_PLAN: list[tuple[str, str, int, int, int]] = [
    ("Renta", "Renta del departamento", 6500, 6500, 1),
    ("Comida", "Super de la semana", 700, 1400, 2),
    ("Comida", "Comida fuera", 150, 420, 2),
    ("Transporte", "Gasolina", 400, 800, 1),
    ("Servicios", "Internet y luz", 600, 950, 1),
    ("Entretenimiento", "Streaming y salidas", 200, 700, 1),
    ("Salud", "Farmacia", 180, 600, 1),
]

INCOME_PLAN: list[tuple[str, str, int, int, int]] = [
    ("Sueldo", "Sueldo quincenal", 9000, 9000, 2),
    ("Freelance", "Proyecto freelance", 1500, 4500, 1),
]

BUDGET_PLAN: list[tuple[str, float]] = [
    ("Comida", 3000),
    ("Transporte", 1200),
    ("Entretenimiento", 900),
    ("Servicios", 1100),
    ("Salud", 800),
]


def _month_starts(count: int) -> list[date]:
    """Primer dia de los ultimos `count` meses, del mas antiguo al actual."""
    today = date.today()
    year, month = today.year, today.month
    starts: list[date] = []
    for _ in range(count):
        starts.append(date(year, month, 1))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return list(reversed(starts))


def seed_demo(db: Session) -> bool:
    """Crea el usuario demo si aun no existe. Devuelve True si lo creo."""
    if db.query(User).filter(User.username == DEMO_USERNAME).first():
        return False

    rng = random.Random(2024)  # datos estables entre reinicios
    user = User(
        username=DEMO_USERNAME,
        full_name="Usuario Demo",
        hashed_password=hash_password(DEMO_PASSWORD),
    )
    db.add(user)
    db.flush()
    create_default_categories(db, user)
    db.flush()

    by_name: dict[tuple[str, CategoryType], Category] = {
        (c.name, c.type): c for c in user.categories
    }
    today = date.today()
    created = 0

    for month_start in _month_starts(3):
        for plan, tx_type, ctype in (
            (INCOME_PLAN, TransactionType.income, CategoryType.income),
            (EXPENSE_PLAN, TransactionType.expense, CategoryType.expense),
        ):
            for cat_name, description, low, high, times in plan:
                category = by_name.get((cat_name, ctype))
                for i in range(times):
                    day = min(1 + i * 14 + rng.randint(0, 10), 28)
                    when = month_start.replace(day=day)
                    if when > today:
                        continue
                    db.add(
                        Transaction(
                            user_id=user.id,
                            category_id=category.id if category else None,
                            type=tx_type,
                            amount=float(rng.randint(low, high)),
                            description=description,
                            date=when,
                            note=None,
                        )
                    )
                    created += 1

    # Completar hasta 30 movimientos con gastos pequenos recientes.
    extras = ["Cafe", "Uber", "Snacks", "Papeleria", "Regalo", "Cine", "Taxi", "Panaderia"]
    otros = by_name.get(("Otros", CategoryType.expense))
    while created < 30:
        db.add(
            Transaction(
                user_id=user.id,
                category_id=otros.id if otros else None,
                type=TransactionType.expense,
                amount=float(rng.randint(60, 350)),
                description=rng.choice(extras),
                date=today - timedelta(days=rng.randint(0, 25)),
                note=None,
            )
        )
        created += 1

    for cat_name, amount in BUDGET_PLAN:
        category = by_name.get((cat_name, CategoryType.expense))
        if category:
            db.add(
                Budget(
                    user_id=user.id,
                    category_id=category.id,
                    amount=amount,
                    year=today.year,
                    month=today.month,
                    recurring=True,
                )
            )

    db.commit()
    return True


def run() -> None:
    db = SessionLocal()
    try:
        if seed_demo(db):
            print("Usuario demo creado: " + DEMO_USERNAME + " / " + DEMO_PASSWORD)
        else:
            print("El usuario demo ya existia, no se toco nada.")
    finally:
        db.close()


if __name__ == "__main__":
    from database import Base, engine

    Base.metadata.create_all(bind=engine)
    run()
