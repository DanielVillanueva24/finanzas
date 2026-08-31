"""Punto de entrada de la API de finanzas personales."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from routers import auth as auth_router
from routers import budgets, categories, reports, transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea las tablas si no existen (Alembic queda para cambios de esquema posteriores).
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        from database import SessionLocal
        from seed import seed_demo

        db = SessionLocal()
        try:
            if seed_demo(db):
                print("[seed] Usuario demo creado -> demo / demo1234")
        finally:
            db.close()
    yield


app = FastAPI(
    title="Finanzas Personales API",
    description="API para registrar ingresos, gastos, presupuestos y reportes.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Acepta ademas cualquier subdominio de onrender.com (el frontend desplegado)
    # y la red local, para abrir la app desde el celular en la misma WiFi.
    allow_origin_regex=(
        r"https://[a-z0-9-]+\.onrender\.com"
        r"|http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}):\d+"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(budgets.router)
app.include_router(reports.router)


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
    return {"status": "ok", "app": "Finanzas Personales API", "docs": "/docs"}


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
