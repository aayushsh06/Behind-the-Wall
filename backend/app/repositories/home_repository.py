"""Home ownership, membership, and atomic invitation acceptance."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.core.ids import new_id
from app.core.security import hash_token, new_session_token
from app.models import Home, HomeInvitation, HomeMember, User
from app.repositories.user_repository import _as_utc


class HomeRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_for_user(self, user: User) -> list[Home]:
        memberships = select(HomeMember.home_id).where(HomeMember.user_id == user.id)
        query = select(Home).where(or_(Home.owner_id == user.id, Home.id.in_(memberships)))
        return list(self._session.scalars(query.order_by(Home.name, Home.id)))

    def permission(self, home: Home, user: User) -> str | None:
        if home.owner_id == user.id:
            return "owner"
        member = self._session.get(HomeMember, (home.id, user.id))
        return member.permission if member else None

    def require(self, home_id: str | None, user: User, *, write: bool = False) -> Home:
        home = self._session.get(Home, home_id) if home_id else None
        permission = self.permission(home, user) if home else None
        if not permission:
            raise HTTPException(404, "Home not found")
        if write and permission == "viewer":
            raise HTTPException(403, "This home has view-only access")
        return home

    def require_owner(self, home_id: str, user: User) -> Home:
        home = self.require(home_id, user)
        if home.owner_id != user.id:
            raise HTTPException(403, "Only the homeowner can manage access")
        return home

    def resolve(self, home_id: str | None, user: User, *, write: bool = False) -> Home:
        if home_id is None:
            homes = self.list_for_user(user)
            if len(homes) != 1:
                raise HTTPException(400, "Choose a home first")
            home_id = homes[0].id
        return self.require(home_id, user, write=write)

    def create(self, name: str, user: User) -> Home:
        if user.role != "homeowner":
            raise HTTPException(403, "Ask a homeowner to invite you to their home")
        home = Home(id=new_id(), name=name, owner_id=user.id)
        self._session.add(home)
        self._session.commit()
        return home

    def invite(self, home: Home, permission: str) -> tuple[HomeInvitation, str]:
        token = new_session_token()
        invite = HomeInvitation(
            id=new_id(),
            home_id=home.id,
            token_hash=hash_token(token),
            permission=permission,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        self._session.add(invite)
        self._session.commit()
        return invite, token

    def accept(self, token: str, user: User) -> Home:
        invite = self._session.scalar(
            select(HomeInvitation).where(HomeInvitation.token_hash == hash_token(token))
        )
        if invite is None or _as_utc(invite.expires_at) <= datetime.now(UTC):
            raise HTTPException(404, "Invitation is invalid or expired")
        home = self._session.get(Home, invite.home_id)
        if home.owner_id == user.id:
            raise HTTPException(400, "You already own this home")
        member = self._session.get(HomeMember, (home.id, user.id))
        if invite.accepted_by == user.id and member:
            return home
        # Claim once in SQL so concurrent requests cannot grant access to two accounts.
        claimed = self._session.execute(
            update(HomeInvitation)
            .where(
                HomeInvitation.id == invite.id,
                HomeInvitation.accepted_by.is_(None),
                HomeInvitation.expires_at > datetime.now(UTC),
            )
            .values(accepted_by=user.id)
            .execution_options(synchronize_session=False)
        ).rowcount
        if not claimed:
            self._session.rollback()
            raise HTTPException(409, "Invitation has already been used")
        if member is None:
            self._session.add(
                HomeMember(
                    home_id=home.id,
                    user_id=user.id,
                    permission=invite.permission,
                )
            )
        elif invite.permission == "editor":
            member.permission = "editor"
        self._session.commit()
        return home

    def members(self, home: Home) -> list[tuple[HomeMember, User]]:
        return list(
            self._session.execute(
                select(HomeMember, User)
                .join(User, HomeMember.user_id == User.id)
                .where(HomeMember.home_id == home.id)
                .order_by(User.name)
            )
        )

    def remove_member(self, home: Home, user_id: str) -> None:
        member = self._session.get(HomeMember, (home.id, user_id))
        if member:
            self._session.delete(member)
            self._session.commit()

    def revoke_invitation(self, home: Home, invitation_id: str) -> None:
        invitation = self._session.get(HomeInvitation, invitation_id)
        if invitation is None or invitation.home_id != home.id:
            raise HTTPException(404, "Invitation not found")
        self._session.delete(invitation)
        self._session.commit()

    def invitations(self, home: Home) -> list[HomeInvitation]:
        return list(
            self._session.scalars(
                select(HomeInvitation)
                .where(
                    HomeInvitation.home_id == home.id,
                    HomeInvitation.accepted_by.is_(None),
                    HomeInvitation.expires_at > datetime.now(UTC),
                )
                .order_by(HomeInvitation.expires_at)
            )
        )
