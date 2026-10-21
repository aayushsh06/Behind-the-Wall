"""Minimal forward-only schema upkeep for the SQLite prototype.

``create_all`` only creates missing tables. Columns added after a device already has
data are appended here so existing records keep working without a migration tool.
"""

from sqlalchemy import Engine, inspect, text

# (table, column, DDL type) for every column added after the first release.
ADDED_COLUMNS: tuple[tuple[str, str, str], ...] = (("walls", "calibration", "JSON"),)


def ensure_columns(engine: Engine) -> list[str]:
    """Add any missing columns. Returns the ``table.column`` names that were added."""
    inspector = inspect(engine)
    added: list[str] = []
    with engine.begin() as connection:
        for table, column, ddl_type in ADDED_COLUMNS:
            if table not in inspector.get_table_names():
                continue
            existing = {col["name"] for col in inspector.get_columns(table)}
            if column in existing:
                continue
            connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
            added.append(f"{table}.{column}")
    return added
