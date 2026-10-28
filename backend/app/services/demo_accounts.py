"""Demo logins for usability sessions and the prototype demo video.

On startup each missing demo account is created, and existing ones get their name and
role reset. The first time they are created on an empty database, the sample home is
loaded too, so signing in shows walls straight away.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.repositories import PhotoRepository, UserRepository, WallRepository
from app.schemas import Role
from app.services.photo_storage import PhotoStorage
from app.services.seed_service import SeedService


@dataclass(frozen=True)
class DemoAccount:
    email: str
    name: str
    role: Role
    password: str


DEMO_PASSWORD = "demo1234"

DEMO_ACCOUNTS: tuple[DemoAccount, ...] = (
    DemoAccount("homeowner@example.com", "Demo Homeowner", Role.HOMEOWNER, DEMO_PASSWORD),
    DemoAccount("tradesperson@example.com", "Demo Tradesperson", Role.TRADESPERSON, DEMO_PASSWORD),
)


def ensure_demo_accounts(session: Session, settings: Settings) -> list[str]:
    """Create any missing demo accounts. Returns the emails that were created."""
    users = UserRepository(session)
    created: list[str] = []
    for account in DEMO_ACCOUNTS:
        user = users.get_by_email(account.email)
        if user is None:
            users.create(
                email=account.email, name=account.name, role=account.role, password=account.password
            )
            created.append(account.email)
        elif (user.name, user.role) != (account.name, account.role):
            user.name, user.role = account.name, account.role
            session.commit()
    walls = WallRepository(session)
    if created and not walls.list():
        SeedService(walls, PhotoRepository(session), PhotoStorage(settings)).seed_sample_home()
    return created
