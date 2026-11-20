"""Persistence operations for photo metadata rows.

``owner_id`` is the account that uploaded the photo. Who else may view it depends on
the walls it is attached to, which the routes check through the wall repository.
"""

from sqlalchemy.orm import Session

from app.models import Photo


class PhotoRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get(self, photo_id: str) -> Photo | None:
        return self._session.get(Photo, photo_id)

    def create(
        self,
        *,
        photo_id: str,
        owner_id: str,
        content_type: str,
        width: int,
        height: int,
        size_bytes: int,
    ) -> Photo:
        photo = Photo(
            id=photo_id,
            owner_id=owner_id,
            content_type=content_type,
            width=width,
            height=height,
            size_bytes=size_bytes,
        )
        self._session.add(photo)
        self._session.commit()
        self._session.refresh(photo)
        return photo

    def upsert(
        self,
        *,
        photo_id: str,
        owner_id: str,
        content_type: str,
        width: int,
        height: int,
        size_bytes: int,
    ) -> Photo:
        """Create the row or refresh its metadata when the image bytes were replaced."""
        existing = self.get(photo_id)
        if existing is None:
            return self.create(
                photo_id=photo_id,
                owner_id=owner_id,
                content_type=content_type,
                width=width,
                height=height,
                size_bytes=size_bytes,
            )
        existing.owner_id = owner_id
        existing.content_type = content_type
        existing.width = width
        existing.height = height
        existing.size_bytes = size_bytes
        self._session.commit()
        self._session.refresh(existing)
        return existing

    def delete(self, photo: Photo) -> None:
        self._session.delete(photo)
        self._session.commit()
