"""Categorias predefinidas que se crean para cada usuario nuevo.

Los colores estan validados para daltonismo (separacion CVD entre colores vecinos),
por eso no se eligieron a ojo.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from models import Category, CategoryType, User

DEFAULT_EXPENSE_CATEGORIES: list[tuple[str, str, str]] = [
    ("Comida", "\U0001F37D", "#E63946"),
    ("Transporte", "\U0001F68C", "#118AB2"),
    ("Renta", "\U0001F3E0", "#7B2CBF"),
    ("Entretenimiento", "\U0001F3AC", "#F77F00"),
    ("Salud", "\U0001F489", "#43AA8B"),
    ("Educacion", "\U0001F393", "#4361EE"),
    ("Ropa", "\U0001F455", "#B58900"),
    ("Servicios", "\U0001F4A1", "#C2185B"),
    ("Otros", "\U0001F4E6", "#2EC4B6"),
]

DEFAULT_INCOME_CATEGORIES: list[tuple[str, str, str]] = [
    ("Sueldo", "\U0001F4BC", "#2EC4B6"),
    ("Freelance", "\U0001F4BB", "#4361EE"),
    ("Inversiones", "\U0001F4C8", "#B58900"),
    ("Regalo", "\U0001F381", "#C2185B"),
    ("Otros", "\U0001F4B5", "#43AA8B"),
]


def create_default_categories(db: Session, user: User) -> list[Category]:
    """Crea las categorias base del usuario. No hace commit."""
    created: list[Category] = []
    for group, ctype in (
        (DEFAULT_EXPENSE_CATEGORIES, CategoryType.expense),
        (DEFAULT_INCOME_CATEGORIES, CategoryType.income),
    ):
        for name, icon, color in group:
            category = Category(
                user_id=user.id, name=name, icon=icon, color=color, type=ctype, is_default=True
            )
            db.add(category)
            created.append(category)
    return created
