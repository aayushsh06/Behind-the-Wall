"""CRUD endpoints for wall records. See app/api/access.py for who can do what."""

from fastapi import APIRouter, HTTPException, status

from app.api.access import (
    can_delete,
    can_edit,
    check_photo_attachable,
    require_tradesperson,
    to_read,
    wall_or_404,
)
from app.api.deps import (
    CurrentUserDep,
    InviteRepoDep,
    PhotoRepoDep,
    UserRepoDep,
    ViewerDep,
    WallRepoDep,
)
from app.models import Wall
from app.schemas import Role, WallCreateRequest, WallRead, WallSummary, WallUpdate

router = APIRouter(prefix="/walls", tags=["walls"])


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
        revision=wall.revision,
        owner=wall.owner,
        pending_owner_email=wall.pending_owner_email,
        created_by=wall.created_by,
        updated_at=wall.updated_at,
    )


@router.get("", response_model=list[WallSummary])
def list_walls(walls: WallRepoDep, viewer: ViewerDep) -> list[WallSummary]:
    return [_to_summary(w) for w in walls.list(viewer)]


@router.post("", response_model=WallRead, status_code=status.HTTP_201_CREATED)
def create_wall(
    payload: WallCreateRequest,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    users: UserRepoDep,
    invites: InviteRepoDep,
    user: CurrentUserDep,
    viewer: ViewerDep,
) -> WallRead:
    require_tradesperson(user)
    check_photo_attachable(photos, walls, payload.photo_id, user, viewer)
    email = payload.homeowner_email
    homeowner = users.get_by_email(email)
    if homeowner is not None and homeowner.role != Role.HOMEOWNER:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "That email belongs to a tradesperson account, not a homeowner.",
        )
    if homeowner is not None and homeowner.email_verified:
        wall = walls.create(payload.to_create(), owner_id=homeowner.id, created_by_id=user.id)
    elif homeowner is not None:
        # Signed up but unconfirmed: hold the wall until they prove they own the email.
        wall = walls.create(payload.to_create(), pending_owner_email=email, created_by_id=user.id)
    else:
        if not payload.invite:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "No one has signed up with that email yet. Invite the homeowner to send them "
                "this wall.",
            )
        invites.upsert(email, user.id)
        wall = walls.create(payload.to_create(), pending_owner_email=email, created_by_id=user.id)
    return to_read(wall, user, viewer)


@router.get("/{wall_id}", response_model=WallRead)
def read_wall(
    wall_id: str, walls: WallRepoDep, user: CurrentUserDep, viewer: ViewerDep
) -> WallRead:
    return to_read(wall_or_404(walls, wall_id, viewer), user, viewer)


@router.put("/{wall_id}", response_model=WallRead)
def update_wall(
    wall_id: str,
    payload: WallUpdate,
    walls: WallRepoDep,
    photos: PhotoRepoDep,
    user: CurrentUserDep,
    viewer: ViewerDep,
) -> WallRead:
    require_tradesperson(user)
    wall = wall_or_404(walls, wall_id, viewer)
    if not can_edit(wall, user, viewer):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't edit this wall")
    check_photo_attachable(photos, walls, payload.photo_id, user, viewer)
    return to_read(walls.update(wall, payload, edited_by_id=user.id), user, viewer)


@router.delete("/{wall_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wall(wall_id: str, walls: WallRepoDep, user: CurrentUserDep, viewer: ViewerDep) -> None:
    wall = wall_or_404(walls, wall_id, viewer)
    if not can_delete(wall, user):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the tradesperson who recorded this wall can delete it"
        )
    walls.delete(wall)
