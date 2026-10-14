"""Подключение к БД. Адрес берётся только из переменной окружения DATABASE_URL."""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "Не задан DATABASE_URL, например postgresql+psycopg://crm:ПАРОЛЬ@localhost:5432/crm"
        )
    return url


def make_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


class Base(DeclarativeBase):
    pass


_engine = None
SessionLocal = sessionmaker(autoflush=False, expire_on_commit=False)


def get_engine():
    # Движок создаётся лениво, чтобы импорт моделей (Alembic, тесты) не требовал БД.
    global _engine
    if _engine is None:
        _engine = make_engine(get_database_url())
        SessionLocal.configure(bind=_engine)
    return _engine


def get_session():
    get_engine()
    with SessionLocal() as session:
        yield session
