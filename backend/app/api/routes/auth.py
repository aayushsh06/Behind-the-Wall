"""Create an account, sign in and out, and read the signed-in user."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.deps import CurrentUserDep, SettingsDep, UserRepoDep
from app.core.config import Settings
from app.core.security import DUMMY_PASSWORD_HASH, verify_password
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


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


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest, response: Response, users: UserRepoDep, settings: SettingsDep
) -> User:
    if users.get_by_email(payload.email) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = users.create(
        email=payload.email, name=payload.name, role=payload.role, password=payload.password
    )
    _sign_in(response, users, settings, user)
    return user


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
