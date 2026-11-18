"""Private homes and homeowner-controlled invitations."""

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, HomeRepoDep
from app.models import Home, User
from app.repositories.home_repository import HomeRepository
from app.schemas.home import (
    HomeCreate,
    HomeRead,
    InvitationAccept,
    InvitationCreate,
    InvitationRead,
    InvitationSummary,
    MemberRead,
)

router = APIRouter(prefix="/homes", tags=["homes"])


def _read(home: Home, user: User, homes: HomeRepository) -> HomeRead:
    return HomeRead(id=home.id, name=home.name, permission=homes.permission(home, user))


@router.get("", response_model=list[HomeRead])
def list_homes(user: CurrentUserDep, homes: HomeRepoDep):
    return [_read(home, user, homes) for home in homes.list_for_user(user)]


@router.post("", response_model=HomeRead, status_code=201)
def create_home(payload: HomeCreate, user: CurrentUserDep, homes: HomeRepoDep):
    return _read(homes.create(payload.name, user), user, homes)


@router.post("/accept-invitation", response_model=HomeRead)
def accept_invitation(payload: InvitationAccept, user: CurrentUserDep, homes: HomeRepoDep):
    return _read(homes.accept(payload.token, user), user, homes)


@router.post("/{home_id}/invitations", response_model=InvitationRead, status_code=201)
def create_invitation(
    home_id: str,
    payload: InvitationCreate,
    user: CurrentUserDep,
    homes: HomeRepoDep,
):
    home = homes.require_owner(home_id, user)
    invitation, token = homes.invite(home, payload.permission)
    return InvitationRead(
        id=invitation.id,
        token=token,
        permission=invitation.permission,
        expires_at=invitation.expires_at,
    )


@router.delete("/{home_id}/invitations/{invitation_id}", status_code=204)
def revoke_invitation(
    home_id: str,
    invitation_id: str,
    user: CurrentUserDep,
    homes: HomeRepoDep,
):
    homes.revoke_invitation(homes.require_owner(home_id, user), invitation_id)


@router.get("/{home_id}/invitations", response_model=list[InvitationSummary])
def list_invitations(home_id: str, user: CurrentUserDep, homes: HomeRepoDep):
    return [
        InvitationSummary(
            id=invitation.id,
            permission=invitation.permission,
            expires_at=invitation.expires_at,
        )
        for invitation in homes.invitations(homes.require_owner(home_id, user))
    ]


@router.get("/{home_id}/members", response_model=list[MemberRead])
def list_members(home_id: str, user: CurrentUserDep, homes: HomeRepoDep):
    return [
        MemberRead(
            user_id=member.user_id,
            name=person.name,
            email=person.email,
            permission=member.permission,
        )
        for member, person in homes.members(homes.require_owner(home_id, user))
    ]


@router.delete("/{home_id}/members/{user_id}", status_code=204)
def remove_member(home_id: str, user_id: str, user: CurrentUserDep, homes: HomeRepoDep):
    homes.remove_member(homes.require_owner(home_id, user), user_id)
