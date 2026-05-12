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


def test_chat_returns_reply_and_updates(monkeypatch: pytest.MonkeyPatch, client: TestClient):
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
            json={"messages": [], "currentData": {}},
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
        json={"messages": [{"role": "user", "content": "hi"}], "currentData": {}},
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
        json={"messages": [{"role": "user", "content": "skip"}], "currentData": {}},
    )
    assert response.status_code == 200
    assert response.json() == {"reply": "ok", "updates": {
        "party1": None,
        "party2": None,
        "purpose": None,
        "effectiveDate": None,
        "mndaTerm": None,
        "termOfConfidentiality": None,
        "governingLawState": None,
        "jurisdiction": None,
        "modifications": None,
    }}
