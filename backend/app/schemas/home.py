"""Home access is granted explicitly, independently of an account's role label."""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class Permission(StrEnum):
    VIEWER = "viewer"
    EDITOR = "editor"


class HomeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Enter a home name")
        return value.strip()


class HomeRead(BaseModel):
    id: str
    name: str
    permission: str


class InvitationCreate(BaseModel):
    permission: Permission = Permission.VIEWER


class InvitationSummary(BaseModel):
    id: str
    permission: Permission
    expires_at: datetime


class InvitationRead(InvitationSummary):
    token: str


class InvitationAccept(BaseModel):
    token: str = Field(min_length=20, max_length=128)


class MemberRead(BaseModel):
    user_id: str
    name: str
    email: str
    permission: Permission
