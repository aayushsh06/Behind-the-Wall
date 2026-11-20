"""Edit access a homeowner grants to tradespeople, and invitations to join.

A tradesperson always reaches the walls they recorded. To view and correct other walls
in a home, they request access by the homeowner's email and the homeowner approves it.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import User


class AccessGrant(Base):
    __tablename__ = "access_grants"
    __table_args__ = (UniqueConstraint("homeowner_id", "tradesperson_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    homeowner_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tradesperson_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # pending -> approved | declined; approved -> revoked. A new request reopens it.
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    message: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    homeowner: Mapped[User] = relationship(foreign_keys=[homeowner_id], lazy="joined")
    tradesperson: Mapped[User] = relationship(foreign_keys=[tradesperson_id], lazy="joined")


class Invite(Base):
    """A tradesperson invited an email with no account to join and receive walls."""

    __tablename__ = "invites"
    __table_args__ = (UniqueConstraint("email", "invited_by_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    invited_by_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_emailed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    invited_by: Mapped[User] = relationship(lazy="joined")
