"""Who may do what with walls and photos.

- Homeowners are read-only: they view every wall in their account (as the app view and
  as a PDF) and manage who has edit access. They never record, edit, or delete walls.
- A tradesperson records walls into a homeowner's account by email, and can view and
  edit the walls they recorded.
- A tradesperson whose edit-access request a homeowner approved can view and edit every
  wall in that home.
- Only the tradesperson who recorded a wall can delete it.
- A photo can be viewed by the account that uploaded it, or through a wall the viewer
  can reach. Records the viewer cannot reach answer 404, so their existence is not leaked.
"""

from fastapi import HTTPException, status

from app.models import Photo, User, Wall
from app.repositories import PhotoRepository, Viewer, WallRepository
from app.schemas import Role, WallRead

READ_ONLY_MESSAGE = (
    "Homeowner accounts are read-only. Walls are recorded and edited by tradespeople."
)


def require_tradesperson(user: User) -> None:
    if user.role != Role.TRADESPERSON:
        raise HTTPException(status.HTTP_403_FORBIDDEN, READ_ONLY_MESSAGE)


def require_homeowner(user: User) -> None:
    if user.role != Role.HOMEOWNER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only homeowners can do this")


def can_edit(wall: Wall, user: User, viewer: Viewer) -> bool:
    return user.role == Role.TRADESPERSON and viewer.reaches(wall)


def can_delete(wall: Wall, user: User) -> bool:
    return user.role == Role.TRADESPERSON and wall.created_by_id == user.id


def wall_or_404(walls: WallRepository, wall_id: str, viewer: Viewer) -> Wall:
    wall = walls.get(wall_id, viewer)
    if wall is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wall not found")
    return wall


def to_read(wall: Wall, user: User, viewer: Viewer) -> WallRead:
    return WallRead.model_validate(wall).model_copy(
        update={"can_edit": can_edit(wall, user, viewer), "can_delete": can_delete(wall, user)}
    )


def photo_or_404(
    photos: PhotoRepository, walls: WallRepository, photo_id: str, user: User, viewer: Viewer
) -> Photo:
    photo = photos.get(photo_id)
    if photo is None or not (photo.owner_id == user.id or walls.photo_visible_to(photo_id, viewer)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    return photo


def check_photo_attachable(
    photos: PhotoRepository,
    walls: WallRepository,
    photo_id: str | None,
    user: User,
    viewer: Viewer,
) -> None:
    """A wall may use a photo the account uploaded or one already on a wall it can reach."""
    if photo_id is None:
        return
    try:
        photo_or_404(photos, walls, photo_id, user, viewer)
    except HTTPException as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "photo_id does not exist"
        ) from exc
