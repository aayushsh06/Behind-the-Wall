"""A single wall record with embedded markers.

A wall lives in one homeowner's account (``owner_id``) and remembers which tradesperson
recorded it (``created_by_id``). A wall sent to an email with no account yet waits with
``owner_id`` empty and ``pending_owner_email`` set, and moves into the homeowner's account
when they sign up with that email. ``revision`` counts saves, so each edit produces a
visibly newer PDF.

Markers are stored as a JSON array because a wall has a handful of them and they
are always read and written together with the wall.
"""

from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User

SCHEMA_VERSION = 2


class Wall(Base):
    __tablename__ = "walls"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # The homeowner whose account the wall is in. Null while the wall waits for an invited
    # homeowner to sign up, or on rows saved before accounts owned records.
    owner_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Email of an invited homeowner who has not signed up yet.
    pending_owner_email: Mapped[str | None] = mapped_column(String(254), nullable=True, index=True)
    # The tradesperson who recorded it.
    created_by_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    last_edited_by_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    revision: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    owner: Mapped[User | None] = relationship(foreign_keys=[owner_id], lazy="joined")
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_id], lazy="joined")
    last_edited_by: Mapped[User | None] = relationship(
        foreign_keys=[last_edited_by_id], lazy="joined"
    )
    schema_version: Mapped[int] = mapped_column(default=SCHEMA_VERSION, nullable=False)

    room: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    author: Mapped[str] = mapped_column(String(120), nullable=False)
    observed_date: Mapped[date] = mapped_column(Date, nullable=False)

    coverage: Mapped[str] = mapped_column(String(16), nullable=False)
    coverage_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    uncovered_region: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    photo_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("photos.id", ondelete="SET NULL"), nullable=True
    )
    calibration: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    markers: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
