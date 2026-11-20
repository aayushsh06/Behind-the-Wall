"""Photo metadata, and the image bytes themselves.

Bytes live in the database (``photo_files``) rather than on disk so the app runs on
hosts without a persistent filesystem, such as Vercel's serverless functions.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # The account that uploaded it. Others can view it only through a wall they can see.
    owner_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    content_type: Mapped[str] = mapped_column(String(64), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PhotoFile(Base):
    """JPEG bytes for a photo and its thumbnail. Written before the metadata row exists,
    so it is keyed by the photo id without a foreign key."""

    __tablename__ = "photo_files"

    photo_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    thumbnail: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
