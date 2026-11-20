"""Demo logins for usability sessions and the prototype demo video.

On startup each missing demo account is created, and existing ones get their name and
role reset. When the demo homeowner is created it gets the sample home, recorded by the
demo tradesperson, so both logins show walls straight away: the homeowner reads all
sample walls, and the tradesperson sees them under that homeowner as a client. Sample
walls added in later versions are filled in on the next start.
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
    seed = SeedService(
        WallRepository(session), PhotoRepository(session), PhotoStorage(settings, session)
    )
    created: list[str] = []
    accounts = {}
    for account in DEMO_ACCOUNTS:
        user = users.get_by_email(account.email)
        if user is None:
            user = users.create(
                email=account.email, name=account.name, role=account.role, password=account.password
            )
            created.append(account.email)
        elif (user.name, user.role) != (account.name, account.role):
            user.name, user.role = account.name, account.role
            session.commit()
        accounts[account.role] = user
    homeowner, trade = accounts[Role.HOMEOWNER], accounts[Role.TRADESPERSON]
    # A new demo homeowner gets the whole sample home; an existing one only gets sample
    # walls added since, so edits made during a demo are kept.
    seed.seed_sample_home(
        homeowner.id, tradesperson_id=trade.id, only_missing=homeowner.email not in created
    )
    return created
