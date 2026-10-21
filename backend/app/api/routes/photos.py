"""Upload and serve wall photos."""

from fastapi import APIRouter, HTTPException, Response, UploadFile, status

from app.api.deps import PhotoRepoDep, PhotoStorageDep, SettingsDep
from app.core.ids import new_id
from app.schemas import PhotoRead
from app.services.photo_storage import JPEG_CONTENT_TYPE, InvalidImageError

router = APIRouter(prefix="/photos", tags=["photos"])

CACHE_HEADERS = {"Cache-Control": "public, max-age=31536000, immutable"}


@router.post("", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile, photos: PhotoRepoDep, storage: PhotoStorageDep, settings: SettingsDep
) -> PhotoRead:
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
        content_type=JPEG_CONTENT_TYPE,
        width=processed.width,
        height=processed.height,
        size_bytes=len(processed.data),
    )
    return PhotoRead.model_validate(photo)


@router.get("/{photo_id}/meta", response_model=PhotoRead)
def read_photo_meta(photo_id: str, photos: PhotoRepoDep) -> PhotoRead:
    photo = photos.get(photo_id)
    if photo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    return PhotoRead.model_validate(photo)


@router.get("/{photo_id}")
def read_photo(photo_id: str, storage: PhotoStorageDep) -> Response:
    data = storage.read(photo_id)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    return Response(content=data, media_type=JPEG_CONTENT_TYPE, headers=CACHE_HEADERS)


@router.get("/{photo_id}/thumbnail")
def read_thumbnail(photo_id: str, storage: PhotoStorageDep) -> Response:
    data = storage.read_thumbnail(photo_id)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    return Response(content=data, media_type=JPEG_CONTENT_TYPE, headers=CACHE_HEADERS)
