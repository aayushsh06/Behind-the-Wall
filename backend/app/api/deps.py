"""FastAPI dependency providers. Routes declare what they need; wiring lives here."""

from collections.abc import Generator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.models import User
from app.repositories import (
    AccessRepository,
    InviteRepository,
    PhotoRepository,
    UserRepository,
    Viewer,
    WallRepository,
)
from app.schemas import Role
from app.services.export_service import ExportService
from app.services.mailer import Mailer
from app.services.pdf_service import PdfService
from app.services.photo_storage import PhotoStorage


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


def get_access_repository(session: SessionDep) -> AccessRepository:
    return AccessRepository(session)


def get_invite_repository(session: SessionDep) -> InviteRepository:
    return InviteRepository(session)


AccessRepoDep = Annotated[AccessRepository, Depends(get_access_repository)]
InviteRepoDep = Annotated[InviteRepository, Depends(get_invite_repository)]


def get_viewer(user: CurrentUserDep, access: AccessRepoDep) -> Viewer:
    """The signed-in account plus the homeowners who granted it edit access."""
    granted = (
        access.approved_homeowner_ids(user.id) if user.role == Role.TRADESPERSON else frozenset()
    )
    return Viewer(user_id=user.id, granted_homeowner_ids=granted)


ViewerDep = Annotated[Viewer, Depends(get_viewer)]


def get_photo_storage(settings: SettingsDep, session: SessionDep) -> PhotoStorage:
    return PhotoStorage(settings, session)


@lru_cache
def get_export_service() -> ExportService:
    return ExportService()


@lru_cache
def get_pdf_service() -> PdfService:
    return PdfService()


def get_mailer(settings: SettingsDep) -> Mailer:
    return Mailer(settings)


WallRepoDep = Annotated[WallRepository, Depends(get_wall_repository)]
PhotoRepoDep = Annotated[PhotoRepository, Depends(get_photo_repository)]
PhotoStorageDep = Annotated[PhotoStorage, Depends(get_photo_storage)]
ExportServiceDep = Annotated[ExportService, Depends(get_export_service)]
PdfServiceDep = Annotated[PdfService, Depends(get_pdf_service)]
MailerDep = Annotated[Mailer, Depends(get_mailer)]
