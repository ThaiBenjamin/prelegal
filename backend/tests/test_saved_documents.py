"""Tests for /api/saved-documents/* endpoints."""

from __future__ import annotations

import importlib
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("PRELEGAL_DB_PATH", str(tmp_path / "prelegal.db"))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
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


def _make_user(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/signup",
        json={"name": "User", "email": email, "password": "hunter2hunter2"},
    )
    assert response.status_code == 200
    body = response.json()
    return {"Authorization": f"Bearer {body['token']}"}


def test_endpoints_require_auth(client: TestClient):
    assert client.get("/api/saved-documents").status_code == 401
    assert (
        client.post(
            "/api/saved-documents",
            json={"documentId": "mutual-nda", "title": "x", "fields": {}},
        ).status_code
        == 401
    )
    assert client.get("/api/saved-documents/1").status_code == 401
    assert client.delete("/api/saved-documents/1").status_code == 401


def test_create_then_list_returns_one(client: TestClient):
    headers = _make_user(client, "a@example.com")
    response = client.post(
        "/api/saved-documents",
        headers=headers,
        json={
            "documentId": "mutual-nda",
            "title": "Acme x Globex",
            "fields": {"purpose": "Share roadmaps"},
        },
    )
    assert response.status_code == 200, response.text
    created = response.json()
    assert created["id"]
    assert created["documentId"] == "mutual-nda"
    assert created["title"] == "Acme x Globex"
    assert created["fields"] == {"purpose": "Share roadmaps"}

    listing = client.get("/api/saved-documents", headers=headers).json()
    assert len(listing) == 1
    assert listing[0]["id"] == created["id"]
    assert listing[0]["title"] == "Acme x Globex"


def test_upsert_updates_existing_row(client: TestClient):
    headers = _make_user(client, "b@example.com")
    created = client.post(
        "/api/saved-documents",
        headers=headers,
        json={"documentId": "csa", "title": "v1", "fields": {"provider": "Acme"}},
    ).json()
    updated = client.post(
        "/api/saved-documents",
        headers=headers,
        json={
            "id": created["id"],
            "documentId": "csa",
            "title": "v2",
            "fields": {"provider": "Acme, Inc."},
        },
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["id"] == created["id"]
    assert body["title"] == "v2"
    assert body["fields"]["provider"] == "Acme, Inc."
    # Listing still only shows the one row.
    listing = client.get("/api/saved-documents", headers=headers).json()
    assert len(listing) == 1


def test_upsert_rejects_unknown_document(client: TestClient):
    headers = _make_user(client, "c@example.com")
    response = client.post(
        "/api/saved-documents",
        headers=headers,
        json={"documentId": "not-a-real-doc", "title": "x", "fields": {}},
    )
    assert response.status_code == 404


def test_upsert_id_not_owned_returns_404(client: TestClient):
    a_headers = _make_user(client, "alice@example.com")
    b_headers = _make_user(client, "bob@example.com")
    created = client.post(
        "/api/saved-documents",
        headers=a_headers,
        json={"documentId": "mutual-nda", "title": "alice doc", "fields": {}},
    ).json()
    response = client.post(
        "/api/saved-documents",
        headers=b_headers,
        json={
            "id": created["id"],
            "documentId": "mutual-nda",
            "title": "bob steals",
            "fields": {},
        },
    )
    assert response.status_code == 404


def test_get_returns_full_document(client: TestClient):
    headers = _make_user(client, "d@example.com")
    created = client.post(
        "/api/saved-documents",
        headers=headers,
        json={"documentId": "sla", "title": "S", "fields": {"targetUptime": "99.9%"}},
    ).json()
    response = client.get(f"/api/saved-documents/{created['id']}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["fields"]["targetUptime"] == "99.9%"


def test_get_other_users_doc_returns_404(client: TestClient):
    a_headers = _make_user(client, "alice@example.com")
    b_headers = _make_user(client, "bob@example.com")
    created = client.post(
        "/api/saved-documents",
        headers=a_headers,
        json={"documentId": "mutual-nda", "title": "alice doc", "fields": {}},
    ).json()
    response = client.get(f"/api/saved-documents/{created['id']}", headers=b_headers)
    assert response.status_code == 404


def test_delete_removes_row(client: TestClient):
    headers = _make_user(client, "e@example.com")
    created = client.post(
        "/api/saved-documents",
        headers=headers,
        json={"documentId": "baa", "title": "B", "fields": {}},
    ).json()
    response = client.delete(f"/api/saved-documents/{created['id']}", headers=headers)
    assert response.status_code == 204
    assert client.get(f"/api/saved-documents/{created['id']}", headers=headers).status_code == 404
    assert client.get("/api/saved-documents", headers=headers).json() == []


def test_list_only_returns_users_own_docs(client: TestClient):
    a_headers = _make_user(client, "alice@example.com")
    b_headers = _make_user(client, "bob@example.com")
    client.post(
        "/api/saved-documents",
        headers=a_headers,
        json={"documentId": "mutual-nda", "title": "alice", "fields": {}},
    )
    client.post(
        "/api/saved-documents",
        headers=b_headers,
        json={"documentId": "csa", "title": "bob1", "fields": {}},
    )
    client.post(
        "/api/saved-documents",
        headers=b_headers,
        json={"documentId": "psa", "title": "bob2", "fields": {}},
    )
    assert len(client.get("/api/saved-documents", headers=a_headers).json()) == 1
    bobs = client.get("/api/saved-documents", headers=b_headers).json()
    assert len(bobs) == 2
    assert {d["title"] for d in bobs} == {"bob1", "bob2"}
