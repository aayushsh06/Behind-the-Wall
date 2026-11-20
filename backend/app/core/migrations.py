"""Minimal forward-only schema upkeep for the SQLite prototype.

``create_all`` only creates missing tables. Columns added after a device already has
data are appended here so existing records keep working without a migration tool.
"""

from sqlalchemy import Engine, inspect, text

# (table, column, DDL type) for every column added after the first release.
ADDED_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("walls", "calibration", "JSON"),
    ("walls", "owner_id", "VARCHAR(32)"),
    ("walls", "created_by_id", "VARCHAR(32)"),
    ("walls", "pending_owner_email", "VARCHAR(254)"),
    ("walls", "last_edited_by_id", "VARCHAR(32)"),
    ("walls", "revision", "INTEGER NOT NULL DEFAULT 1"),
    ("photos", "owner_id", "VARCHAR(32)"),
    ("users", "email_verified_at", "DATETIME"),
)

# Run once, right after the column is added, to fill in values for existing rows.
BACKFILLS: dict[tuple[str, str], str] = {
    # Accounts that existed before email confirmation was required keep working.
    ("users", "email_verified_at"): "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP",
}

# (index name, table, column) for indexes on columns listed above.
ADDED_INDEXES: tuple[tuple[str, str, str], ...] = (
    ("ix_walls_owner_id", "walls", "owner_id"),
    ("ix_walls_created_by_id", "walls", "created_by_id"),
    ("ix_walls_pending_owner_email", "walls", "pending_owner_email"),
    ("ix_photos_owner_id", "photos", "owner_id"),
)


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
            if (table, column) in BACKFILLS:
                connection.execute(text(BACKFILLS[(table, column)]))
            added.append(f"{table}.{column}")
        tables = set(inspector.get_table_names())
        for index, table, column in ADDED_INDEXES:
            if table in tables:
                connection.execute(
                    text(f"CREATE INDEX IF NOT EXISTS {index} ON {table} ({column})")
                )
    return added
