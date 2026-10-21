"""FastAPI dependency providers. Routes declare what they need; wiring lives here."""

from collections.abc import Generator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.repositories import PhotoRepository, WallRepository
from app.services.export_service import ExportService
from app.services.photo_storage import PhotoStorage
from app.services.seed_service import SeedService


def _session() -> Generator[Session, None, None]:
    yield from get_session()


SessionDep = Annotated[Session, Depends(_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_wall_repository(session: SessionDep) -> WallRepository:
    return WallRepository(session)


def get_photo_repository(session: SessionDep) -> PhotoRepository:
    return PhotoRepository(session)


def get_photo_storage(settings: SettingsDep) -> PhotoStorage:
    return PhotoStorage(settings)


@lru_cache
def get_export_service() -> ExportService:
    return ExportService()


WallRepoDep = Annotated[WallRepository, Depends(get_wall_repository)]
PhotoRepoDep = Annotated[PhotoRepository, Depends(get_photo_repository)]
PhotoStorageDep = Annotated[PhotoStorage, Depends(get_photo_storage)]
ExportServiceDep = Annotated[ExportService, Depends(get_export_service)]


def get_seed_service(
    walls: WallRepoDep, photos: PhotoRepoDep, storage: PhotoStorageDep
) -> SeedService:
    return SeedService(walls, photos, storage)


SeedServiceDep = Annotated[SeedService, Depends(get_seed_service)]
