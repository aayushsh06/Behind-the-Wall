"""Persistence operations for accounts and login sessions."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.ids import new_id
from app.core.security import hash_password, hash_token, new_session_token
from app.models import AuthSession, User


def _as_utc(moment: datetime) -> datetime:
    # SQLite drops the timezone on read; stored values are always UTC.
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


class UserRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(func.lower(User.email) == email.strip().lower())
        return self._session.scalars(stmt).first()

    def create(self, *, email: str, name: str, role: str, password: str) -> User:
        user = User(
            id=new_id(),
            email=email.strip().lower(),
            name=name.strip(),
            role=role,
            password_hash=hash_password(password),
        )
        self._session.add(user)
        self._session.commit()
        self._session.refresh(user)
        return user

    def start_session(self, user: User, lifetime: timedelta) -> str:
        """Create a login session and return the raw token for the cookie."""
        token = new_session_token()
        self._session.add(
            AuthSession(
                token_hash=hash_token(token),
                user_id=user.id,
                expires_at=datetime.now(UTC) + lifetime,
            )
        )
        self._session.commit()
        return token

    def user_for_token(self, token: str) -> User | None:
        auth = self._session.get(AuthSession, hash_token(token))
        if auth is None:
            return None
        if _as_utc(auth.expires_at) <= datetime.now(UTC):
            self._session.delete(auth)
            self._session.commit()
            return None
        return self._session.get(User, auth.user_id)

    def end_session(self, token: str) -> None:
        stmt = delete(AuthSession).where(AuthSession.token_hash == hash_token(token))
        self._session.execute(stmt)
        self._session.commit()
