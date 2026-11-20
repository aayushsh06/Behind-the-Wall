"""Persistence operations for walls. Routes never talk to SQLAlchemy directly.

Which walls an account can reach is decided in app/api/access.py; queries here take the
resulting ``Viewer`` (account id plus homeowners who granted it access). Any wall
outside that set is treated exactly like one that does not exist.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.core.ids import new_id
from app.models import Wall
from app.schemas import WallCreate, WallUpdate


@dataclass(frozen=True)
class Viewer:
    user_id: str
    # Homeowners who approved this account's edit-access request.
    granted_homeowner_ids: frozenset[str] = field(default_factory=frozenset)

    def reaches(self, wall: Wall) -> bool:
        return (
            self.user_id in (wall.owner_id, wall.created_by_id)
            or wall.owner_id in self.granted_homeowner_ids
        )


def _visible_to(viewer: Viewer):
    clauses = [Wall.owner_id == viewer.user_id, Wall.created_by_id == viewer.user_id]
    if viewer.granted_homeowner_ids:
        clauses.append(Wall.owner_id.in_(viewer.granted_homeowner_ids))
    return or_(*clauses)


class WallRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list(self, viewer: Viewer) -> list[Wall]:
        stmt = select(Wall).where(_visible_to(viewer)).order_by(Wall.room, Wall.label)
        return list(self._session.scalars(stmt).unique())

    def get(self, wall_id: str, viewer: Viewer) -> Wall | None:
        wall = self._session.get(Wall, wall_id)
        return wall if wall is not None and viewer.reaches(wall) else None

    def photo_visible_to(self, photo_id: str, viewer: Viewer) -> bool:
        """True when the photo is on a wall the account can reach."""
        stmt = select(Wall.id).where(Wall.photo_id == photo_id, _visible_to(viewer)).limit(1)
        return self._session.scalars(stmt).first() is not None

    def has_pending_for(self, email: str, created_by_id: str) -> bool:
        stmt = select(Wall.id).where(
            Wall.pending_owner_email == email, Wall.created_by_id == created_by_id
        )
        return self._session.scalars(stmt.limit(1)).first() is not None

    def create(
        self,
        data: WallCreate,
        *,
        created_by_id: str,
        owner_id: str | None = None,
        pending_owner_email: str | None = None,
        wall_id: str | None = None,
    ) -> Wall:
        if (owner_id is None) == (pending_owner_email is None):
            raise ValueError("A wall needs exactly one of owner_id or pending_owner_email")
        wall = Wall(
            id=wall_id or new_id(),
            owner_id=owner_id,
            pending_owner_email=pending_owner_email,
            created_by_id=created_by_id,
            last_edited_by_id=created_by_id,
            revision=1,
            **self._to_columns(data),
        )
        self._session.add(wall)
        self._session.commit()
        self._session.refresh(wall)
        return wall

    def update(self, wall: Wall, data: WallUpdate, *, edited_by_id: str) -> Wall:
        for column, value in self._to_columns(data).items():
            setattr(wall, column, value)
        wall.revision = (wall.revision or 1) + 1
        wall.last_edited_by_id = edited_by_id
        self._session.commit()
        self._session.refresh(wall)
        return wall

    def claim_pending(self, email: str, homeowner_id: str) -> int:
        """Move walls waiting for this email into the homeowner's account."""
        result = self._session.execute(
            update(Wall)
            .where(Wall.pending_owner_email == email)
            .values(owner_id=homeowner_id, pending_owner_email=None)
        )
        self._session.commit()
        return result.rowcount or 0

    def upsert(self, wall_id: str, data: WallCreate, *, owner_id: str, created_by_id: str) -> Wall:
        """Create or replace a wall by id (sample home only; ids are derived per account)."""
        existing = self._session.get(Wall, wall_id)
        if existing is None:
            return self.create(
                data, owner_id=owner_id, created_by_id=created_by_id, wall_id=wall_id
            )
        existing.owner_id, existing.created_by_id = owner_id, created_by_id
        existing.pending_owner_email = None
        updated = self.update(
            existing, WallUpdate.model_validate(data.model_dump()), edited_by_id=created_by_id
        )
        updated.revision = 1
        self._session.commit()
        return updated

    def delete(self, wall: Wall) -> None:
        self._session.delete(wall)
        self._session.commit()

    @staticmethod
    def owners_of(walls: Iterable[Wall]) -> set[str]:
        return {w.owner_id for w in walls if w.owner_id}

    @staticmethod
    def _to_columns(data: WallCreate | WallUpdate) -> dict:
        """Translate a schema into ORM column values (nested models become JSON)."""
        payload = data.model_dump(mode="json")
        # JSON mode stringifies the date; the Date column needs a real date object.
        payload["observed_date"] = data.observed_date
        return payload
