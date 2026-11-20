"""Create an account, confirm its email, sign in and out, and read the signed-in user.

A new account starts unconfirmed and is emailed a confirmation link. Until it is
confirmed the account can sign in but cannot reach any records, and walls sent to its
email wait. Confirming moves those walls into the account.
"""

import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.deps import CurrentUserDep, MailerDep, SettingsDep, UserRepoDep, WallRepoDep
from app.api.links import public_base
from app.core.config import Settings
from app.core.security import DUMMY_PASSWORD_HASH, verify_password
from app.models import User
from app.repositories import UserRepository
from app.schemas import (
    LoginRequest,
    RegisterRequest,
    Role,
    UserRead,
    VerifyEmailRequest,
    VerifyEmailResult,
)
from app.services.mailer import Mailer, MailError

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("behind_the_wall")


def _sign_in(response: Response, users: UserRepoDep, settings: Settings, user: User) -> None:
    lifetime = timedelta(days=settings.session_days)
    token = users.start_session(user, lifetime)
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=int(lifetime.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=settings.session_cookie_secure,
        path="/",
    )


def _send_confirmation(
    user: User, request: Request, users: UserRepository, mailer: Mailer, settings: Settings
) -> None:
    token = users.start_verification(user, timedelta(hours=settings.verification_hours))
    link = f"{public_base(request, settings)}/verify-email?token={token}"
    body = (
        f"Hi {user.name},\n\n"
        "Confirm your email address to finish setting up your Behind the Wall account:\n"
        f"{link}\n\n"
        f"The link stops working after {settings.verification_hours} hours. If you didn't "
        "create this account, you can ignore this email.\n"
    )
    if not mailer.configured:
        # Development without SMTP: the link is only available in the server log.
        logger.warning("Email confirmation link for %s: %s", user.email, link)
        return
    try:
        mailer.send(user.email, "Confirm your email for Behind the Wall", body)
    except MailError:
        logger.exception("Could not send the confirmation email to %s", user.email)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "We couldn't send the confirmation email. Try again in a few minutes.",
        ) from None


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    users: UserRepoDep,
    mailer: MailerDep,
    settings: SettingsDep,
) -> User:
    existing = users.get_by_email(payload.email)
    if existing is not None:
        if existing.email_verified:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "An account with this email already exists"
            )
        # Nobody proved they own this email, so whoever does can claim it now.
        users.delete(existing)
    user = users.create(
        email=payload.email, name=payload.name, role=payload.role, password=payload.password
    )
    _sign_in(response, users, settings, user)
    _send_confirmation(user, request, users, mailer, settings)
    return user


@router.post("/verify-email", response_model=VerifyEmailResult)
def verify_email(
    payload: VerifyEmailRequest, users: UserRepoDep, walls: WallRepoDep
) -> VerifyEmailResult:
    user = users.confirm_email(payload.token)
    if user is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This confirmation link is invalid or has expired. Sign in to get a new one.",
        )
    received = walls.claim_pending(user.email, user.id) if user.role == Role.HOMEOWNER else 0
    return VerifyEmailResult(email=user.email, walls_received=received)


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
def resend_verification(
    request: Request,
    users: UserRepoDep,
    mailer: MailerDep,
    settings: SettingsDep,
    user: CurrentUserDep,
) -> None:
    if user.email_verified:
        raise HTTPException(status.HTTP_409_CONFLICT, "Your email is already confirmed")
    sent = users.last_verification_sent(user)
    window = timedelta(seconds=settings.verification_resend_seconds)
    if sent is not None and datetime.now(UTC) - sent < window:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "We just sent a confirmation email. Wait a minute before asking for another.",
        )
    _send_confirmation(user, request, users, mailer, settings)


@router.post("/login", response_model=UserRead)
def login(
    payload: LoginRequest, response: Response, users: UserRepoDep, settings: SettingsDep
) -> User:
    user = users.get_by_email(payload.email)
    valid = verify_password(payload.password, user.password_hash if user else DUMMY_PASSWORD_HASH)
    if user is None or not valid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect")
    _sign_in(response, users, settings, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, users: UserRepoDep, settings: SettingsDep) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        users.end_session(token)
    response.delete_cookie(settings.session_cookie_name, path="/")


@router.get("/me", response_model=UserRead)
def me(user: CurrentUserDep) -> User:
    return user
