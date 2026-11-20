"""Vercel entry point: the FastAPI backend as a serverless Python function.

vercel.json rewrites every /api/* request here; the built frontend is served as static
files. Each cold start makes sure the tables exist and the demo accounts are present,
without relying on ASGI lifespan events. Records live in Postgres (DATABASE_URL), since
serverless functions have no persistent disk.
"""

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.core.database import SessionLocal, init_db  # noqa: E402
from app.main import app  # noqa: E402,F401  (Vercel serves this ASGI app)
from app.services.demo_accounts import ensure_demo_accounts  # noqa: E402

logger = logging.getLogger("behind_the_wall")


def _prepare() -> None:
    settings = get_settings()
    if not settings.database_url:
        logger.warning(
            "DATABASE_URL is not set: using a temporary SQLite file that is lost between "
            "requests. Connect a Postgres database in the Vercel dashboard."
        )
    try:
        init_db()
        if settings.demo_accounts:
            with SessionLocal() as session:
                ensure_demo_accounts(session, settings)
    except Exception:
        # Two instances starting at once can race to create the same rows; the other
        # one wins and the next cold start finds everything in place.
        logger.exception("Startup preparation did not finish")


_prepare()
