"""SQLite initialization for the prelegal backend.

The DB is treated as ephemeral: each process start drops the users table
and recreates it. This matches the V1 foundation requirement that the
database is created from scratch every time the container starts.
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path


def _default_db_path() -> Path:
    """Pick a sensible default DB path per platform.

    Containers (POSIX) write to /tmp; on Windows we use a local data
    folder next to the backend package so dev runs do not need /tmp.
    """
    if os.name == "posix":
        return Path("/tmp/prelegal.db")
    return Path(__file__).resolve().parent.parent / "data" / "prelegal.db"


DB_PATH = Path(os.environ.get("PRELEGAL_DB_PATH", str(_default_db_path())))

SCHEMA = """
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def get_connection() -> sqlite3.Connection:
    """Open a connection with row access by column name."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Recreate the users table on startup."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(SCHEMA)
