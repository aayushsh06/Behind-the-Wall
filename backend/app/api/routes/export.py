"""Single-wall handoff exports (HTML for reading, JSON for re-import)."""

from fastapi import APIRouter, Response

from app.api.deps import (
    CurrentUserDep,
    ExportServiceDep,
    HomeRepoDep,
    PhotoRepoDep,
    PhotoStorageDep,
    WallRepoDep,
    require_photo,
    require_wall,
)
from app.services.export_service import ExportBundle

router = APIRouter(prefix="/walls/{wall_id}/export", tags=["export"])


def _as_response(bundle: ExportBundle, *, download: bool) -> Response:
    disposition = "attachment" if download else "inline"
    return Response(
        content=bundle.content,
        media_type=bundle.media_type,
        headers={"Content-Disposition": f'{disposition}; filename="{bundle.filename}"'},
    )


def _load(
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    storage: PhotoStorageDep,
    wall_id: str,
    homes: HomeRepoDep,
    user: CurrentUserDep,
):
    wall = require_wall(wall_id, walls, homes, user)
    photo = require_photo(wall.photo_id, photos, homes, user) if wall.photo_id else None
    photo_bytes = storage.read(photo.id) if photo else None
    return wall, photo, photo_bytes


@router.get(".html")
def export_html(
    wall_id: str,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    storage: PhotoStorageDep,
    exporter: ExportServiceDep,
    homes: HomeRepoDep,
    user: CurrentUserDep,
    download: bool = False,
) -> Response:
    wall, photo, photo_bytes = _load(walls, photos, storage, wall_id, homes, user)
    return _as_response(exporter.to_html(wall, photo, photo_bytes), download=download)


@router.get(".json")
def export_json(
    wall_id: str,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    storage: PhotoStorageDep,
    exporter: ExportServiceDep,
    homes: HomeRepoDep,
    user: CurrentUserDep,
    download: bool = False,
) -> Response:
    wall, photo, photo_bytes = _load(walls, photos, storage, wall_id, homes, user)
    return _as_response(exporter.to_json(wall, photo, photo_bytes), download=download)
