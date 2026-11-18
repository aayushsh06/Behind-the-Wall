"""SQLAlchemy engine, session factory, and declarative base."""

from collections.abc import Generator

from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _build_engine():
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    url = settings.resolved_database_url
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    """Create tables that do not exist yet. Import models so they register on Base."""
    import app.models  # noqa: F401
    from app.core.migrations import ensure_columns

    Base.metadata.create_all(bind=engine)
    ensure_columns(engine)
    # Existing homeowners also need a home after upgrading from shared records.
    from app.core.ids import new_id
    from app.models import Home, User

    with SessionLocal() as session:
        owners = session.scalars(select(User).where(User.role == "homeowner"))
        for user in owners:
            if get_settings().demo_accounts and user.email == "homeowner@example.com":
                continue
            if session.scalar(select(Home.id).where(Home.owner_id == user.id)) is None:
                session.add(Home(id=new_id(), name="My home", owner_id=user.id))
        session.commit()


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
