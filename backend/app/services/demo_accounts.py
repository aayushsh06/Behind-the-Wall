"""Demo logins for usability sessions and the prototype demo video.

On startup each missing demo account is created, and existing ones get their name and
role reset. The first time they are created on an empty database, the sample home is
loaded too, so signing in shows walls straight away.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import Home, HomeMember
from app.repositories import PhotoRepository, UserRepository, WallRepository
from app.schemas import Role
from app.services.photo_storage import PhotoStorage
from app.services.seed_service import DEMO_HOME_ID, SAMPLE_WALLS, SeedService


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
                email=account.email,
                name=account.name,
                role=account.role,
                password=account.password,
                create_home=False,
            )
            created.append(account.email)
        elif (user.name, user.role) != (account.name, account.role):
            user.name, user.role = account.name, account.role
            session.commit()
    owner = users.get_by_email(DEMO_ACCOUNTS[0].email)
    contractor = users.get_by_email(DEMO_ACCOUNTS[1].email)
    home = session.get(Home, DEMO_HOME_ID)
    if home is None:
        session.add(Home(id=DEMO_HOME_ID, name="Sample home", owner_id=owner.id))
        session.flush()
        session.add(HomeMember(home_id=DEMO_HOME_ID, user_id=contractor.id, permission="editor"))
        # Only the known demonstration records have an unambiguous legacy owner.
        walls = WallRepository(session)
        photos = PhotoRepository(session)
        for sample in SAMPLE_WALLS:
            wall = walls.get(sample.wall_id)
            if wall and wall.home_id is None:
                wall.home_id = DEMO_HOME_ID
            photo = photos.get(sample.photo_id)
            if photo and photo.home_id is None:
                photo.home_id = DEMO_HOME_ID
        session.commit()
        if not walls.list(DEMO_HOME_ID):
            SeedService(walls, photos, PhotoStorage(settings)).seed_sample_home(DEMO_HOME_ID)
    return created
