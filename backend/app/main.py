"""FastAPI application factory."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import SessionLocal, init_db
from app.services.demo_accounts import ensure_demo_accounts
from app.spa import mount_spa

logger = logging.getLogger("behind_the_wall")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    settings = get_settings()
    if not (settings.smtp_host and settings.smtp_from):
        logger.warning(
            "BTW_SMTP_HOST/BTW_SMTP_FROM are not set: confirmation emails cannot be sent. "
            "Confirmation links are written to this log instead. Set SMTP before real use."
        )
    if settings.demo_accounts:
        with SessionLocal() as session:
            ensure_demo_accounts(session, settings)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    mount_spa(app, settings.frontend_dist)
    return app


app = create_app()
