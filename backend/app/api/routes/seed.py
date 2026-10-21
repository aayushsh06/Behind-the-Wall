"""Load the sample home used for usability sessions."""

from fastapi import APIRouter

from app.api.deps import SeedServiceDep

router = APIRouter(prefix="/seed", tags=["seed"])


@router.post("/sample-home")
def seed_sample_home(seed: SeedServiceDep) -> dict[str, list[str]]:
    return {"wall_ids": seed.seed_sample_home()}
