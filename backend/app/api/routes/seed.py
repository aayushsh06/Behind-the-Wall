"""Load the sample home used for usability sessions."""

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, HomeRepoDep, SeedServiceDep

router = APIRouter(prefix="/seed", tags=["seed"])


@router.post("/sample-home")
def seed_sample_home(
    seed: SeedServiceDep,
    homes: HomeRepoDep,
    user: CurrentUserDep,
    home_id: str | None = None,
) -> dict[str, list[str]]:
    home = homes.resolve(home_id, user, write=True)
    return {"wall_ids": seed.seed_sample_home(home.id)}
