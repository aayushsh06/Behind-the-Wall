"""Persistence operations for accounts and login sessions."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.ids import new_id
from app.core.security import hash_password, hash_token, new_session_token
from app.models import AuthSession, EmailVerification, User


def _as_utc(moment: datetime) -> datetime:
    # SQLite drops the timezone on read; stored values are always UTC.
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


class UserRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(func.lower(User.email) == email.strip().lower())
        return self._session.scalars(stmt).first()

    def create(
        self, *, email: str, name: str, role: str, password: str, verified: bool = False
    ) -> User:
        user = User(
            id=new_id(),
            email=email.strip().lower(),
            name=name.strip(),
            role=role,
            password_hash=hash_password(password),
            email_verified_at=datetime.now(UTC) if verified else None,
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

    def delete(self, user: User) -> None:
        self._session.delete(user)
        self._session.commit()

    # ---- email confirmation --------------------------------------------------------

    def start_verification(self, user: User, lifetime: timedelta) -> str:
        """Issue a confirmation token (replacing earlier ones) and return the raw token."""
        self._session.execute(delete(EmailVerification).where(EmailVerification.user_id == user.id))
        token = new_session_token()
        now = datetime.now(UTC)
        self._session.add(
            EmailVerification(
                token_hash=hash_token(token),
                user_id=user.id,
                created_at=now,
                expires_at=now + lifetime,
            )
        )
        self._session.commit()
        return token

    def last_verification_sent(self, user: User) -> datetime | None:
        stmt = select(EmailVerification.created_at).where(EmailVerification.user_id == user.id)
        sent = self._session.scalars(stmt).first()
        return _as_utc(sent) if sent else None

    def confirm_email(self, token: str) -> User | None:
        """Mark the token's account confirmed. None when the token is unknown or expired."""
        record = self._session.get(EmailVerification, hash_token(token))
        if record is None:
            return None
        user = self._session.get(User, record.user_id)
        expired = _as_utc(record.expires_at) <= datetime.now(UTC)
        self._session.execute(
            delete(EmailVerification).where(EmailVerification.user_id == record.user_id)
        )
        if user is None or expired:
            self._session.commit()
            return None
        if user.email_verified_at is None:
            user.email_verified_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(user)
        return user

    def mark_verified(self, user: User) -> None:
        if user.email_verified_at is None:
            user.email_verified_at = datetime.now(UTC)
            self._session.commit()
