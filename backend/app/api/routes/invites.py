"""Check whether an email can receive walls, and invite homeowners who haven't joined."""

from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request, status

from app.api.access import require_tradesperson
from app.api.deps import (
    CurrentUserDep,
    InviteRepoDep,
    MailerDep,
    SettingsDep,
    UserRepoDep,
    WallRepoDep,
)
from app.api.links import public_base
from app.schemas import HomeownerLookup, HomeownerStatus, InviteRead, InviteRequest, Role
from app.services.mailer import MailError

router = APIRouter(tags=["invites"])


@router.get("/homeowners/lookup", response_model=HomeownerLookup)
def lookup_homeowner(email: str, users: UserRepoDep, user: CurrentUserDep) -> HomeownerLookup:
    require_tradesperson(user)
    email = email.strip().lower()
    account = users.get_by_email(email)
    if account is None:
        found = HomeownerStatus.NOT_REGISTERED
    elif account.role == Role.HOMEOWNER and not account.email_verified:
        found = HomeownerStatus.UNCONFIRMED
    elif account.role == Role.HOMEOWNER:
        found = HomeownerStatus.REGISTERED
    else:
        found = HomeownerStatus.NOT_A_HOMEOWNER
    return HomeownerLookup(email=email, status=found)


def _as_utc(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


@router.post("/invites", response_model=InviteRead)
def send_invite(
    payload: InviteRequest,
    request: Request,
    users: UserRepoDep,
    walls: WallRepoDep,
    invites: InviteRepoDep,
    mailer: MailerDep,
    settings: SettingsDep,
    user: CurrentUserDep,
) -> InviteRead:
    require_tradesperson(user)
    email = payload.email
    existing = users.get_by_email(email)
    if existing is not None:
        detail = (
            "This person has signed up but hasn't confirmed their email yet. Their walls are "
            "held until they do."
            if not existing.email_verified
            else "This person already has an account, so walls go straight to them."
        )
        raise HTTPException(status.HTTP_409_CONFLICT, detail)
    # Invitations only go to people this tradesperson has actually sent a wall to.
    if not walls.has_pending_for(email, user.id):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Send this homeowner a wall before inviting them.",
        )

    base = public_base(request, settings)
    url = f"{base}/register?{urlencode({'email': email, 'role': 'homeowner'})}"
    invite = invites.upsert(email, user.id)

    if not mailer.configured:
        return InviteRead(
            email=email,
            invite_url=url,
            emailed=False,
            detail="Email isn't set up on this server. Send the invitation from your email app.",
        )
    window = timedelta(minutes=settings.invite_resend_minutes)
    if invite.last_emailed_at and datetime.now(UTC) - _as_utc(invite.last_emailed_at) < window:
        return InviteRead(
            email=email,
            invite_url=url,
            emailed=False,
            detail="An invitation was emailed recently. You can also send the link yourself.",
        )
    body = (
        f"{user.name} recorded what's inside a wall in your home and sent you the record "
        f"on Behind the Wall.\n\n"
        f"Create your free account with this email address to see it:\n{url}\n\n"
        "You'll be able to view each wall's annotated PDF any time, and every wall your "
        "tradespeople record for you will be kept in one place.\n"
    )
    try:
        mailer.send(email, f"{user.name} sent you a wall record", body)
    except MailError as exc:
        return InviteRead(
            email=email, invite_url=url, emailed=False, detail=f"{exc}. Send the link yourself."
        )
    invites.mark_emailed(invite)
    return InviteRead(
        email=email, invite_url=url, emailed=True, detail=f"Invitation emailed to {email}."
    )
