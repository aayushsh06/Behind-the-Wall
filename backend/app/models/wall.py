"""A single wall record with embedded markers.

Markers are stored as a JSON array because a wall has a handful of them and they
are always read and written together with the wall.
"""

from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

SCHEMA_VERSION = 1


class Wall(Base):
    __tablename__ = "walls"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
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
