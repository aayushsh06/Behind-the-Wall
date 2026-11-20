"""Edit-access requests: a tradesperson asks a homeowner, the homeowner decides."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.access import require_homeowner, require_tradesperson
from app.api.deps import AccessRepoDep, CurrentUserDep, UserRepoDep
from app.models import AccessGrant
from app.repositories.access_repository import APPROVED, DECLINED, PENDING, REVOKED
from app.schemas import AccessDecision, AccessGrantRead, AccessRequestCreate, Role

router = APIRouter(prefix="/access-requests", tags=["access"])

# decision -> (status it must currently have, status it moves to)
TRANSITIONS = {
    AccessDecision.APPROVE: (PENDING, APPROVED),
    AccessDecision.DECLINE: (PENDING, DECLINED),
    AccessDecision.REVOKE: (APPROVED, REVOKED),
}


class DecisionBody(BaseModel):
    decision: AccessDecision


@router.get("", response_model=list[AccessGrantRead])
def list_requests(access: AccessRepoDep, user: CurrentUserDep) -> list[AccessGrant]:
    if user.role == Role.HOMEOWNER:
        return access.for_homeowner(user.id)
    return access.for_tradesperson(user.id)


@router.post("", response_model=AccessGrantRead, status_code=status.HTTP_201_CREATED)
def request_access(
    payload: AccessRequestCreate, access: AccessRepoDep, users: UserRepoDep, user: CurrentUserDep
) -> AccessGrant:
    require_tradesperson(user)
    homeowner = users.get_by_email(payload.homeowner_email)
    if homeowner is None or homeowner.role != Role.HOMEOWNER or not homeowner.email_verified:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "No homeowner account uses that email. Check the spelling, or record a wall and "
            "invite them.",
        )
    return access.request(homeowner.id, user.id, payload.message.strip())


@router.post("/{grant_id}/decision", response_model=AccessGrantRead)
def decide(
    grant_id: str, body: DecisionBody, access: AccessRepoDep, user: CurrentUserDep
) -> AccessGrant:
    require_homeowner(user)
    grant = access.get(grant_id)
    if grant is None or grant.homeowner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    required, target = TRANSITIONS[body.decision]
    if grant.status != required:
        raise HTTPException(status.HTTP_409_CONFLICT, f"This request is already {grant.status}")
    return access.decide(grant, target)
