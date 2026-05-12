"""Tests for /api/auth/* endpoints."""

from __future__ import annotations

import importlib
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """Each test gets a fresh DB on disk."""
    monkeypatch.setenv("PRELEGAL_DB_PATH", str(tmp_path / "prelegal.db"))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    # Reload the modules that captured DB_PATH / JWT secret at import time.
    import app.auth as auth_module
    import app.db as db_module
    import app.routes.auth as auth_route
    import app.routes.saved_documents as saved_route

    importlib.reload(db_module)
    importlib.reload(auth_module)
    importlib.reload(auth_route)
    importlib.reload(saved_route)
    import app.main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


def _signup(client: TestClient, email: str = "alice@example.com") -> dict:
    response = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": email, "password": "hunter2hunter2"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_signup_creates_account_and_returns_token(client: TestClient):
    body = _signup(client)
    assert body["token"]
    assert body["user"]["name"] == "Alice"
    assert body["user"]["email"] == "alice@example.com"
    assert isinstance(body["user"]["id"], int)


def test_signup_normalizes_email_case(client: TestClient):
    body = _signup(client, email="Mixed.Case@Example.com")
    assert body["user"]["email"] == "mixed.case@example.com"


def test_signup_rejects_duplicate_email(client: TestClient):
    _signup(client)
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Alice Two",
            "email": "alice@example.com",
            "password": "hunter2hunter2",
        },
    )
    assert response.status_code == 409


def test_signup_rejects_short_password(client: TestClient):
    response = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@example.com", "password": "short"},
    )
    assert response.status_code == 422


def test_signin_with_correct_password_returns_token(client: TestClient):
    _signup(client)
    response = client.post(
        "/api/auth/signin",
        json={"email": "alice@example.com", "password": "hunter2hunter2"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["user"]["email"] == "alice@example.com"


def test_signin_is_case_insensitive_on_email(client: TestClient):
    _signup(client)
    response = client.post(
        "/api/auth/signin",
        json={"email": "ALICE@Example.com", "password": "hunter2hunter2"},
    )
    assert response.status_code == 200


def test_signin_with_wrong_password_returns_401(client: TestClient):
    _signup(client)
    response = client.post(
        "/api/auth/signin",
        json={"email": "alice@example.com", "password": "not-the-password"},
    )
    assert response.status_code == 401


def test_signin_with_unknown_email_returns_401(client: TestClient):
    response = client.post(
        "/api/auth/signin",
        json={"email": "nobody@example.com", "password": "hunter2hunter2"},
    )
    assert response.status_code == 401


def test_me_requires_token(client: TestClient):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user(client: TestClient):
    body = _signup(client)
    response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_me_rejects_garbage_token(client: TestClient):
    response = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"}
    )
    assert response.status_code == 401
