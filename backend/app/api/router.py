from fastapi import APIRouter, Depends

from app.api.deps import get_verified_user
from app.api.routes import access, auth, export, health, invites, photos, walls

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)

# Everything that reads or changes records requires a signed-in account with a confirmed
# email address. Unconfirmed accounts can only use /api/auth.
_signed_in = [Depends(get_verified_user)]
api_router.include_router(walls.router, dependencies=_signed_in)
api_router.include_router(photos.router, dependencies=_signed_in)
api_router.include_router(export.router, dependencies=_signed_in)
api_router.include_router(access.router, dependencies=_signed_in)
api_router.include_router(invites.router, dependencies=_signed_in)
