"""Tests for the /api/chat endpoint.

The LLM call (litellm.completion) is monkeypatched in every test; no
network or API key is required.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes import chat as chat_module


def _fake_completion_response(payload: dict[str, Any]) -> SimpleNamespace:
    """Build the minimal shape that litellm.completion returns."""
    message = SimpleNamespace(content=json.dumps(payload))
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    with TestClient(app) as c:
        yield c


def test_chat_returns_reply_and_updates_for_mutual_nda(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
):
    captured: dict[str, Any] = {}

    def fake_completion(**kwargs: Any) -> SimpleNamespace:
        captured.update(kwargs)
        return _fake_completion_response(
            {
                "reply": "Got it. What is Party 1's company name?",
                "updates": {"purpose": "Exploring a partnership."},
            }
        )

    monkeypatch.setattr(chat_module, "completion", fake_completion)

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "We want to share roadmap info."}],
            "currentData": {"purpose": ""},
            "documentId": "mutual-nda",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"].startswith("Got it.")
    assert body["updates"]["purpose"] == "Exploring a partnership."
    # Sanity check that the system prompt and conversation reach the model.
    assert captured["model"] == chat_module.MODEL
    assert captured["extra_body"] == chat_module.EXTRA_BODY
    messages = captured["messages"]
    assert messages[0]["role"] == "system"
    assert "Mutual Non-Disclosure" in messages[0]["content"]
    assert messages[-1] == {"role": "user", "content": "We want to share roadmap info."}


def test_chat_returns_503_when_api_key_missing(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with TestClient(app) as client:
        response = client.post(
            "/api/chat",
            json={"messages": [], "currentData": {}, "documentId": "mutual-nda"},
        )
    assert response.status_code == 503
    assert "OPENROUTER_API_KEY" in response.json()["detail"]


def test_chat_returns_502_when_llm_call_raises(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
):
    def boom(**_: Any) -> SimpleNamespace:
        raise RuntimeError("upstream rate-limited")

    monkeypatch.setattr(chat_module, "completion", boom)

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "currentData": {},
            "documentId": "mutual-nda",
        },
    )
    assert response.status_code == 502
    assert "upstream rate-limited" in response.json()["detail"]


def test_chat_accepts_empty_updates(monkeypatch: pytest.MonkeyPatch, client: TestClient):
    monkeypatch.setattr(
        chat_module,
        "completion",
        lambda **_: _fake_completion_response({"reply": "ok", "updates": {}}),
    )
    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "skip"}],
            "currentData": {},
            "documentId": "mutual-nda",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "ok"
    # All NDA fields should be present and null.
    assert body["updates"]["party1"] is None
    assert body["updates"]["modifications"] is None


def test_chat_selector_mode_returns_selected_document(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
):
    captured: dict[str, Any] = {}

    def fake_completion(**kwargs: Any) -> SimpleNamespace:
        captured.update(kwargs)
        return _fake_completion_response(
            {
                "reply": "Great, let's draft a Mutual NDA.",
                "selectedDocumentId": "mutual-nda",
            }
        )

    monkeypatch.setattr(chat_module, "completion", fake_completion)

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "I need an NDA"}],
            "currentData": {},
            "documentId": None,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["selectedDocumentId"] == "mutual-nda"
    assert "Mutual NDA" in body["reply"] or "NDA" in body["reply"]
    # Selector system prompt must list multiple supported docs and ask for guidance.
    system = captured["messages"][0]["content"]
    assert "CSA" in system
    assert "Pilot Agreement" in system
    assert "closest supported one" in system


def test_chat_generic_document_flow_validates_per_doc_schema(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
):
    captured: dict[str, Any] = {}

    def fake_completion(**kwargs: Any) -> SimpleNamespace:
        captured.update(kwargs)
        return _fake_completion_response(
            {
                "reply": "Got it. Who is the Customer?",
                "updates": {
                    "provider": "Acme, Inc.",
                    "governingLaw": "Delaware",
                    # An unknown field would be dropped by the schema.
                    "notARealField": "ignored",
                },
            }
        )

    monkeypatch.setattr(chat_module, "completion", fake_completion)

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "Provider is Acme."}],
            "currentData": {"provider": ""},
            "documentId": "csa",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["updates"]["provider"] == "Acme, Inc."
    assert body["updates"]["governingLaw"] == "Delaware"
    # Unknown field must not appear in the per-doc schema.
    assert "notARealField" not in body["updates"]
    # System prompt must be the generic one tailored to this doc.
    system = captured["messages"][0]["content"]
    assert "Cloud Service Agreement" in system  # full doc name used in generic prompt
    assert "provider" in system


def test_chat_generic_document_flow_rejects_unknown_doc(
    monkeypatch: pytest.MonkeyPatch, client: TestClient
):
    monkeypatch.setattr(chat_module, "completion", lambda **_: _fake_completion_response({"reply": "ok", "updates": {}}))

    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "currentData": {},
            "documentId": "made-up-doc",
        },
    )
    # Unknown doc id: the route raises 404, which the outer handler should
    # propagate (HTTPException short-circuits the 502 fallback).
    assert response.status_code == 404
