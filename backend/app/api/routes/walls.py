"""CRUD endpoints for wall records."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import PhotoRepoDep, WallRepoDep
from app.models import Wall
from app.schemas import WallCreate, WallRead, WallSummary, WallUpdate

router = APIRouter(prefix="/walls", tags=["walls"])


def _get_or_404(walls: WallRepoDep, wall_id: str) -> Wall:
    wall = walls.get(wall_id)
    if wall is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wall not found")
    return wall


def _check_photo_exists(photos: PhotoRepoDep, photo_id: str | None) -> None:
    if photo_id is not None and photos.get(photo_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "photo_id does not exist")


def _to_summary(wall: Wall) -> WallSummary:
    return WallSummary(
        id=wall.id,
        room=wall.room,
        label=wall.label,
        author=wall.author,
        observed_date=wall.observed_date,
        coverage=wall.coverage,
        photo_id=wall.photo_id,
        marker_count=len(wall.markers or []),
        updated_at=wall.updated_at,
    )


@router.get("", response_model=list[WallSummary])
def list_walls(walls: WallRepoDep) -> list[WallSummary]:
    return [_to_summary(w) for w in walls.list()]


@router.post("", response_model=WallRead, status_code=status.HTTP_201_CREATED)
def create_wall(payload: WallCreate, walls: WallRepoDep, photos: PhotoRepoDep) -> Wall:
    _check_photo_exists(photos, payload.photo_id)
    return walls.create(payload)


@router.get("/{wall_id}", response_model=WallRead)
def read_wall(wall_id: str, walls: WallRepoDep) -> Wall:
    return _get_or_404(walls, wall_id)


@router.put("/{wall_id}", response_model=WallRead)
def update_wall(
    wall_id: str, payload: WallUpdate, walls: WallRepoDep, photos: PhotoRepoDep
) -> Wall:
    wall = _get_or_404(walls, wall_id)
    _check_photo_exists(photos, payload.photo_id)
    return walls.update(wall, payload)


@router.delete("/{wall_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wall(wall_id: str, walls: WallRepoDep) -> None:
    walls.delete(_get_or_404(walls, wall_id))
