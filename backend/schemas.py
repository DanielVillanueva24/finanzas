"""Esquemas Pydantic de entrada y salida de la API."""
from __future__ import annotations

from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from models import CategoryType, TransactionType

# --------------------------------------------------------------------------- auth


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not v.replace("_", "").replace(".", "").isalnum():
            raise ValueError("El usuario solo admite letras, numeros, punto y guion bajo")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None
    currency: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ----------------------------------------------------------------------- categorias


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    icon: str = Field(default="\U0001F4B0", max_length=8)
    color: str = Field(default="#4361EE", pattern=r"^#(?:[0-9a-fA-F]{3}){1,2}$")
    type: CategoryType = CategoryType.expense


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    icon: str | None = Field(default=None, max_length=8)
    color: str | None = Field(default=None, pattern=r"^#(?:[0-9a-fA-F]{3}){1,2}$")
    type: CategoryType | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_default: bool


# --------------------------------------------------------------------- transacciones


class TransactionBase(BaseModel):
    type: TransactionType
    amount: float = Field(gt=0, le=999_999_999)
    description: str = Field(min_length=1, max_length=160)
    date: date_type
    category_id: int | None = None
    note: str | None = Field(default=None, max_length=500)

    @field_validator("amount")
    @classmethod
    def round_amount(cls, v: float) -> float:
        return round(v, 2)


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    amount: float | None = Field(default=None, gt=0, le=999_999_999)
    description: str | None = Field(default=None, min_length=1, max_length=160)
    date: date_type | None = None
    category_id: int | None = None
    note: str | None = Field(default=None, max_length=500)


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    category: CategoryOut | None = None


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    limit: int
    pages: int


# --------------------------------------------------------------------- presupuestos


class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(gt=0, le=999_999_999)
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    recurring: bool = True


class BudgetUpdate(BaseModel):
    amount: float | None = Field(default=None, gt=0, le=999_999_999)
    recurring: bool | None = None


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    amount: float
    year: int
    month: int
    recurring: bool
    category: CategoryOut
    spent: float = 0.0
    remaining: float = 0.0
    percentage: float = 0.0
    status: str = "ok"  # ok | warning | exceeded


# -------------------------------------------------------------------------- reportes


class SummaryOut(BaseModel):
    start: date_type
    end: date_type
    income: float
    expense: float
    net: float
    transactions: int
    avg_daily_expense: float


class CategoryTotal(BaseModel):
    category_id: int | None
    name: str
    icon: str
    color: str
    type: TransactionType
    total: float
    percentage: float
    count: int


class MonthPoint(BaseModel):
    year: int
    month: int
    label: str
    income: float
    expense: float
    balance: float
    cumulative: float
