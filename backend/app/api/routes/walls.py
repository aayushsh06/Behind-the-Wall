"""CRUD endpoints for wall records."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, HomeRepoDep, PhotoRepoDep, WallRepoDep, require_wall
from app.models import Wall
from app.schemas import WallCreate, WallRead, WallSummary, WallUpdate

router = APIRouter(prefix="/walls", tags=["walls"])


def _check_photo_exists(photos: PhotoRepoDep, photo_id: str | None, home_id: str) -> None:
    if photo_id is None:
        return
    photo = photos.get(photo_id)
    if photo is None or photo.home_id != home_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Photo is not in this home")


def _to_summary(wall: Wall) -> WallSummary:
    return WallSummary(
        id=wall.id,
        home_id=wall.home_id,
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
def list_walls(
    walls: WallRepoDep,
    homes: HomeRepoDep,
    user: CurrentUserDep,
    home_id: str | None = None,
) -> list[WallSummary]:
    home = homes.resolve(home_id, user)
    return [_to_summary(w) for w in walls.list(home.id)]


@router.post("", response_model=WallRead, status_code=status.HTTP_201_CREATED)
def create_wall(
    payload: WallCreate,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    homes: HomeRepoDep,
    user: CurrentUserDep,
    home_id: str | None = None,
) -> Wall:
    home = homes.resolve(home_id, user, write=True)
    _check_photo_exists(photos, payload.photo_id, home.id)
    return walls.create(payload, home_id=home.id)


@router.get("/{wall_id}", response_model=WallRead)
def read_wall(wall_id: str, walls: WallRepoDep, homes: HomeRepoDep, user: CurrentUserDep) -> Wall:
    return require_wall(wall_id, walls, homes, user)


@router.put("/{wall_id}", response_model=WallRead)
def update_wall(
    wall_id: str,
    payload: WallUpdate,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    homes: HomeRepoDep,
    user: CurrentUserDep,
) -> Wall:
    wall = require_wall(wall_id, walls, homes, user, write=True)
    _check_photo_exists(photos, payload.photo_id, wall.home_id)
    return walls.update(wall, payload)


@router.delete("/{wall_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wall(wall_id: str, walls: WallRepoDep, homes: HomeRepoDep, user: CurrentUserDep) -> None:
    walls.delete(require_wall(wall_id, walls, homes, user, write=True))
