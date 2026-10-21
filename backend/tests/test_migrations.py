from pathlib import Path

from sqlalchemy import create_engine, inspect, text

from app.core.migrations import ensure_columns


def test_ensure_columns_adds_missing_column(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE walls (id TEXT PRIMARY KEY, room TEXT)"))

    assert ensure_columns(engine) == ["walls.calibration"]
    assert "calibration" in {c["name"] for c in inspect(engine).get_columns("walls")}
    assert ensure_columns(engine) == []
