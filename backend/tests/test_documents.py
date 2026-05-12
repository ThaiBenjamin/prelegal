"""Tests for the /api/documents endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_lists_all_documents(client: TestClient):
    response = client.get("/api/documents")
    assert response.status_code == 200
    docs = response.json()
    ids = [d["id"] for d in docs]

    expected = {
        "mutual-nda",
        "csa",
        "design-partner-agreement",
        "sla",
        "psa",
        "dpa",
        "software-license-agreement",
        "partnership-agreement",
        "pilot-agreement",
        "baa",
        "ai-addendum",
    }
    assert expected.issubset(set(ids))
    for d in docs:
        assert {"id", "name", "shortName", "description"} <= d.keys()


def test_standard_terms_returns_markdown(client: TestClient):
    response = client.get("/api/documents/mutual-nda/standard-terms")
    assert response.status_code == 200
    body = response.text
    assert "Standard Terms" in body
    assert "Confidential Information" in body


def test_standard_terms_404_for_unknown_doc(client: TestClient):
    response = client.get("/api/documents/no-such-doc/standard-terms")
    assert response.status_code == 404


def test_standard_terms_available_for_every_document(client: TestClient):
    docs = client.get("/api/documents").json()
    for d in docs:
        r = client.get(f"/api/documents/{d['id']}/standard-terms")
        assert r.status_code == 200, f"missing template for {d['id']}"
        assert len(r.text) > 100
