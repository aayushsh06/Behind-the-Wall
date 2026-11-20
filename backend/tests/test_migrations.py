from pathlib import Path

from sqlalchemy import create_engine, inspect, text

from app.core.migrations import ensure_columns


def test_ensure_columns_adds_missing_column(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE walls (id TEXT PRIMARY KEY, room TEXT)"))
        conn.execute(text("CREATE TABLE photos (id TEXT PRIMARY KEY, width INTEGER)"))
        conn.execute(text("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT)"))
        conn.execute(text("INSERT INTO users (id, email) VALUES ('u1', 'old@example.com')"))

    assert ensure_columns(engine) == [
        "walls.calibration",
        "walls.owner_id",
        "walls.created_by_id",
        "walls.pending_owner_email",
        "walls.last_edited_by_id",
        "walls.revision",
        "photos.owner_id",
        "users.email_verified_at",
    ]
    with engine.begin() as conn:
        # Accounts from before confirmation existed are treated as confirmed.
        verified = conn.execute(text("SELECT email_verified_at FROM users")).scalar_one()
    assert verified is not None
    revision = next(c for c in inspect(engine).get_columns("walls") if c["name"] == "revision")
    assert revision["nullable"] is False
    inspector = inspect(engine)
    assert {"calibration", "owner_id"} <= {c["name"] for c in inspector.get_columns("walls")}
    assert "owner_id" in {c["name"] for c in inspector.get_columns("photos")}
    assert "ix_walls_owner_id" in {i["name"] for i in inspector.get_indexes("walls")}
    assert ensure_columns(engine) == []
