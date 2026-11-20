"""SQLAlchemy engine, session factory, and declarative base."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import ON_VERCEL, get_settings


class Base(DeclarativeBase):
    pass


def _build_engine():
    settings = get_settings()
    url = settings.resolved_database_url
    if url.startswith("sqlite"):
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})
    # Serverless instances freeze between requests, so don't keep idle connections
    # around there; elsewhere a small pool with liveness checks is fine.
    if ON_VERCEL:
        return create_engine(url, poolclass=NullPool)
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    """Create tables that do not exist yet. Import models so they register on Base."""
    import app.models  # noqa: F401
    from app.core.migrations import ensure_columns

    Base.metadata.create_all(bind=engine)
    ensure_columns(engine)


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
