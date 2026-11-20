"""Single-wall documents: PDF (the record homeowners read), HTML, and JSON for re-import.

Each is built from the wall's current saved state, so an edit shows up immediately.
"""

from fastapi import APIRouter, Response

from app.api.access import wall_or_404
from app.api.deps import (
    ExportServiceDep,
    PdfServiceDep,
    PhotoRepoDep,
    PhotoStorageDep,
    ViewerDep,
    WallRepoDep,
)
from app.repositories import PhotoRepository, Viewer, WallRepository
from app.services.export_service import ExportBundle
from app.services.photo_storage import PhotoStorage

router = APIRouter(prefix="/walls/{wall_id}/export", tags=["export"])


def _as_response(bundle: ExportBundle, *, download: bool) -> Response:
    disposition = "attachment" if download else "inline"
    return Response(
        content=bundle.content,
        media_type=bundle.media_type,
        headers={
            "Content-Disposition": f'{disposition}; filename="{bundle.filename}"',
            # Always rebuilt from the latest save; never serve a stale revision.
            "Cache-Control": "no-store",
        },
    )


def _load(
    walls: WallRepository,
    photos: PhotoRepository,
    storage: PhotoStorage,
    wall_id: str,
    viewer: Viewer,
):
    wall = wall_or_404(walls, wall_id, viewer)
    # Reaching the wall is what grants access to its photo.
    photo = photos.get(wall.photo_id) if wall.photo_id else None
    photo_bytes = storage.read(photo.id) if photo else None
    return wall, photo, photo_bytes


@router.get(".pdf")
def export_pdf(
    wall_id: str,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    storage: PhotoStorageDep,
    pdf: PdfServiceDep,
    viewer: ViewerDep,
    download: bool = False,
) -> Response:
    wall, photo, photo_bytes = _load(walls, photos, storage, wall_id, viewer)
    return _as_response(pdf.to_pdf(wall, photo, photo_bytes), download=download)


@router.get(".html")
def export_html(
    wall_id: str,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    storage: PhotoStorageDep,
    exporter: ExportServiceDep,
    viewer: ViewerDep,
    download: bool = False,
) -> Response:
    wall, photo, photo_bytes = _load(walls, photos, storage, wall_id, viewer)
    return _as_response(exporter.to_html(wall, photo, photo_bytes), download=download)


@router.get(".json")
def export_json(
    wall_id: str,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    storage: PhotoStorageDep,
    exporter: ExportServiceDep,
    viewer: ViewerDep,
    download: bool = False,
) -> Response:
    wall, photo, photo_bytes = _load(walls, photos, storage, wall_id, viewer)
    return _as_response(exporter.to_json(wall, photo, photo_bytes), download=download)
