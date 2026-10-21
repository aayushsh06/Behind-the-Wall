"""ID generation helpers kept in one place so the format can change later."""

from uuid import uuid4


def new_id() -> str:
    return uuid4().hex
