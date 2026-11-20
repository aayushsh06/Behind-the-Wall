"""Upload and serve wall photos. See app/api/access.py for who can view a photo."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response, UploadFile, status

from app.api.access import photo_or_404, require_tradesperson
from app.api.deps import (
    CurrentUserDep,
    PhotoRepoDep,
    PhotoStorageDep,
    SettingsDep,
    ViewerDep,
    WallRepoDep,
)
from app.core.ids import new_id
from app.schemas import PhotoRead
from app.services.photo_storage import JPEG_CONTENT_TYPE, InvalidImageError

router = APIRouter(prefix="/photos", tags=["photos"])


@router.post("", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile,
    photos: PhotoRepoDep,
    storage: PhotoStorageDep,
    settings: SettingsDep,
    user: CurrentUserDep,
) -> PhotoRead:
    require_tradesperson(user)
    raw = await file.read(settings.max_upload_bytes + 1)
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Photo is too large")
    if not raw:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Empty upload")

    photo_id = new_id()
    try:
        processed = storage.save(photo_id, raw)
    except InvalidImageError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    photo = photos.create(
        photo_id=photo_id,
        owner_id=user.id,
        content_type=JPEG_CONTENT_TYPE,
        width=processed.width,
        height=processed.height,
        size_bytes=len(processed.data),
    )
    return PhotoRead.model_validate(photo)


@router.get("/{photo_id}/meta", response_model=PhotoRead)
def read_photo_meta(
    photo_id: str,
    photos: PhotoRepoDep,
    walls: WallRepoDep,
    user: CurrentUserDep,
    viewer: ViewerDep,
) -> PhotoRead:
    return PhotoRead.model_validate(photo_or_404(photos, walls, photo_id, user, viewer))


@router.get("/{photo_id}")
def read_photo(
    photo_id: str,
    request: Request,
    photos: PhotoRepoDep,
    walls: WallRepoDep,
    storage: PhotoStorageDep,
    user: CurrentUserDep,
    viewer: ViewerDep,
) -> Response:
    photo_or_404(photos, walls, photo_id, user, viewer)
    return _image_response(request, storage.path_for(photo_id))


@router.get("/{photo_id}/thumbnail")
def read_thumbnail(
    photo_id: str,
    request: Request,
    photos: PhotoRepoDep,
    walls: WallRepoDep,
    storage: PhotoStorageDep,
    user: CurrentUserDep,
    viewer: ViewerDep,
) -> Response:
    photo_or_404(photos, walls, photo_id, user, viewer)
    thumb = storage.thumbnail_path_for(photo_id)
    return _image_response(request, thumb if thumb.exists() else storage.path_for(photo_id))


def _image_response(request: Request, path: Path) -> Response:
    """Serve a JPEG with an ETag so browsers revalidate instead of caching a stale image.

    Photo bytes can be rewritten under the same id (the sample-home seed does this), so
    the response must not be marked immutable. Revalidation is a cheap 304 round trip.
    """
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    stat = path.stat()
    etag = f'"{stat.st_size:x}-{stat.st_mtime_ns:x}"'
    headers = {"ETag": etag, "Cache-Control": "no-cache"}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)
    return Response(content=path.read_bytes(), media_type=JPEG_CONTENT_TYPE, headers=headers)
