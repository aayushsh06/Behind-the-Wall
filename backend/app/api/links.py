"""Absolute links to the site, for emails."""

from fastapi import Request

from app.core.config import Settings


def public_base(request: Request, settings: Settings) -> str:
    """The site's public address: BTW_PUBLIC_URL, or the address the request came in on."""
    return (settings.public_url or str(request.base_url)).rstrip("/")
