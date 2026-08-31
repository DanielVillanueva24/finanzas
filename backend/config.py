"""Configuracion central de la aplicacion (leida desde variables de entorno / .env)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Base de datos
    database_url: str = "sqlite:///./finanzas.db"

    # Seguridad / JWT
    secret_key: str = "cambia-esta-llave-en-produccion-por-una-aleatoria-larga"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 dias

    # CORS: origenes separados por coma
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Datos de prueba al arrancar
    seed_demo_data: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
