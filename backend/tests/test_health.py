"""Smoke tests for the backend skeleton."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok():
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_users_table_is_recreated_on_startup(tmp_path, monkeypatch):
    db_path = tmp_path / "prelegal.db"
    monkeypatch.setenv("PRELEGAL_DB_PATH", str(db_path))

    # Re-import db with the patched env so it picks up the new path.
    import importlib

    import app.db as db_module

    importlib.reload(db_module)
    db_module.init_db()

    with db_module.get_connection() as conn:
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        )
        assert cur.fetchone() is not None
