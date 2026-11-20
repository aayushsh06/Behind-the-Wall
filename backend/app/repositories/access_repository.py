"""Persistence for edit-access grants and invitations."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.ids import new_id
from app.models import AccessGrant, Invite

PENDING, APPROVED, DECLINED, REVOKED = "pending", "approved", "declined", "revoked"


class AccessRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, grant_id: str) -> AccessGrant | None:
        return self._session.get(AccessGrant, grant_id)

    def find(self, homeowner_id: str, tradesperson_id: str) -> AccessGrant | None:
        stmt = select(AccessGrant).where(
            AccessGrant.homeowner_id == homeowner_id,
            AccessGrant.tradesperson_id == tradesperson_id,
        )
        return self._session.scalars(stmt).first()

    def request(self, homeowner_id: str, tradesperson_id: str, message: str) -> AccessGrant:
        """Open a request, or reopen a declined or revoked one. Approved ones stay approved."""
        grant = self.find(homeowner_id, tradesperson_id)
        if grant is None:
            grant = AccessGrant(
                id=new_id(),
                homeowner_id=homeowner_id,
                tradesperson_id=tradesperson_id,
                status=PENDING,
                message=message,
            )
            self._session.add(grant)
        elif grant.status != APPROVED:
            grant.status, grant.message, grant.decided_at = PENDING, message, None
            grant.created_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(grant)
        return grant

    def decide(self, grant: AccessGrant, status: str) -> AccessGrant:
        grant.status = status
        grant.decided_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(grant)
        return grant

    def for_homeowner(self, homeowner_id: str) -> list[AccessGrant]:
        stmt = (
            select(AccessGrant)
            .where(AccessGrant.homeowner_id == homeowner_id)
            .order_by(AccessGrant.created_at.desc())
        )
        return list(self._session.scalars(stmt).unique())

    def for_tradesperson(self, tradesperson_id: str) -> list[AccessGrant]:
        stmt = (
            select(AccessGrant)
            .where(AccessGrant.tradesperson_id == tradesperson_id)
            .order_by(AccessGrant.created_at.desc())
        )
        return list(self._session.scalars(stmt).unique())

    def approved_homeowner_ids(self, tradesperson_id: str) -> frozenset[str]:
        stmt = select(AccessGrant.homeowner_id).where(
            AccessGrant.tradesperson_id == tradesperson_id, AccessGrant.status == APPROVED
        )
        return frozenset(self._session.scalars(stmt))


class InviteRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(self, email: str, invited_by_id: str) -> Invite:
        stmt = select(Invite).where(Invite.email == email, Invite.invited_by_id == invited_by_id)
        invite = self._session.scalars(stmt).first()
        if invite is None:
            invite = Invite(id=new_id(), email=email, invited_by_id=invited_by_id)
            self._session.add(invite)
            self._session.commit()
            self._session.refresh(invite)
        return invite

    def mark_emailed(self, invite: Invite) -> None:
        invite.last_emailed_at = datetime.now(UTC)
        self._session.commit()
