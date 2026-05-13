"""SQLAlchemy engine, session factory, and Base class."""

from __future__ import annotations

from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

_db_path = settings.database_url
if _db_path.startswith("sqlite:///"):
    Path(_db_path.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if _db_path.startswith("sqlite") else {}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Common declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Safe to call at startup; idempotent for SQLite."""

    from . import models  # noqa: F401  ensure models register on Base.metadata

    Base.metadata.create_all(bind=engine)
