"""FastAPI dependency providers. Routes declare what they need; wiring lives here."""

from collections.abc import Generator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.models import Photo, User, Wall
from app.repositories import PhotoRepository, UserRepository, WallRepository
from app.repositories.home_repository import HomeRepository
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


def get_user_repository(session: SessionDep) -> UserRepository:
    return UserRepository(session)


UserRepoDep = Annotated[UserRepository, Depends(get_user_repository)]


def get_current_user(request: Request, users: UserRepoDep, settings: SettingsDep) -> User:
    token = request.cookies.get(settings.session_cookie_name)
    user = users.user_for_token(token) if token else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_home_repository(session: SessionDep) -> HomeRepository:
    return HomeRepository(session)


HomeRepoDep = Annotated[HomeRepository, Depends(get_home_repository)]


def require_wall(
    wall_id: str,
    walls: WallRepository,
    homes: HomeRepository,
    user: User,
    *,
    write: bool = False,
) -> Wall:
    wall = walls.get(wall_id)
    if wall is None or wall.home_id is None:
        raise HTTPException(404, "Wall not found")
    homes.require(wall.home_id, user, write=write)
    return wall


def require_photo(
    photo_id: str, photos: PhotoRepository, homes: HomeRepository, user: User
) -> Photo:
    photo = photos.get(photo_id)
    if photo is None or photo.home_id is None:
        raise HTTPException(404, "Photo not found")
    homes.require(photo.home_id, user)
    return photo


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
