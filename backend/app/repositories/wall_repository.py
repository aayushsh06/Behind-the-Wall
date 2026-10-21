"""Persistence operations for walls. Routes never talk to SQLAlchemy directly."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.ids import new_id
from app.models import Wall
from app.schemas import WallCreate, WallUpdate


class WallRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list(self) -> list[Wall]:
        stmt = select(Wall).order_by(Wall.room, Wall.label)
        return list(self._session.scalars(stmt))

    def get(self, wall_id: str) -> Wall | None:
        return self._session.get(Wall, wall_id)

    def get_by_photo(self, photo_id: str) -> list[Wall]:
        stmt = select(Wall).where(Wall.photo_id == photo_id)
        return list(self._session.scalars(stmt))

    def create(self, data: WallCreate, wall_id: str | None = None) -> Wall:
        wall = Wall(id=wall_id or new_id(), **self._to_columns(data))
        self._session.add(wall)
        self._session.commit()
        self._session.refresh(wall)
        return wall

    def update(self, wall: Wall, data: WallUpdate) -> Wall:
        for column, value in self._to_columns(data).items():
            setattr(wall, column, value)
        self._session.commit()
        self._session.refresh(wall)
        return wall

    def upsert(self, wall_id: str, data: WallCreate) -> Wall:
        existing = self.get(wall_id)
        if existing is None:
            return self.create(data, wall_id=wall_id)
        return self.update(existing, WallUpdate.model_validate(data.model_dump()))

    def delete(self, wall: Wall) -> None:
        self._session.delete(wall)
        self._session.commit()

    @staticmethod
    def _to_columns(data: WallCreate | WallUpdate) -> dict:
        """Translate a schema into ORM column values (nested models become JSON)."""
        payload = data.model_dump(mode="json")
        # JSON mode stringifies the date; the Date column needs a real date object.
        payload["observed_date"] = data.observed_date
        return payload
