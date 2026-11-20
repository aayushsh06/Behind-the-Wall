"""Shapes for edit-access requests, homeowner lookup, and invitations."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.wall import AccountBrief


class AccessRequestCreate(BaseModel):
    homeowner_email: str = Field(min_length=3, max_length=254)
    message: str = Field(default="", max_length=500)

    @field_validator("homeowner_email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AccessGrantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    message: str
    created_at: datetime
    decided_at: datetime | None
    homeowner: AccountBrief
    tradesperson: AccountBrief


class AccessDecision(StrEnum):
    APPROVE = "approve"
    DECLINE = "decline"
    REVOKE = "revoke"


class HomeownerStatus(StrEnum):
    REGISTERED = "registered"
    # Signed up as a homeowner but hasn't confirmed the email yet; walls are held.
    UNCONFIRMED = "unconfirmed"
    NOT_REGISTERED = "not_registered"
    NOT_A_HOMEOWNER = "not_a_homeowner"


class HomeownerLookup(BaseModel):
    """Whether an email can receive walls. Deliberately omits the account's name."""

    email: str
    status: HomeownerStatus


class InviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class InviteRead(BaseModel):
    email: str
    invite_url: str
    # True when this server emailed the invitation; otherwise send invite_url yourself.
    emailed: bool
    detail: str
