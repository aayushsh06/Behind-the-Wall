from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.routes import auth, export, health, photos, seed, walls

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)

# Everything that reads or changes records requires a signed-in user.
_signed_in = [Depends(get_current_user)]
api_router.include_router(walls.router, dependencies=_signed_in)
api_router.include_router(photos.router, dependencies=_signed_in)
api_router.include_router(export.router, dependencies=_signed_in)
api_router.include_router(seed.router, dependencies=_signed_in)
