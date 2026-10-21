from fastapi import APIRouter

from app.api.routes import export, health, photos, seed, walls

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(walls.router)
api_router.include_router(photos.router)
api_router.include_router(export.router)
api_router.include_router(seed.router)
