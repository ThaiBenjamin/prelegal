"""Conversational endpoint that drafts a Mutual NDA with the user.

Wraps a LiteLLM -> OpenRouter -> Cerebras call configured to return a
structured response containing both the assistant's reply and a partial
update to the NDA fields. The frontend merges those updates into the live
document preview.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel, Field

router = APIRouter()
log = logging.getLogger(__name__)

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


class PartyPatch(BaseModel):
    company: str | None = None
    signatoryName: str | None = None
    signatoryTitle: str | None = None
    noticeAddress: str | None = None


class MndaTermUpdate(BaseModel):
    kind: Literal["years", "until-terminated"]
    years: int | None = None


class ConfTermUpdate(BaseModel):
    kind: Literal["years", "perpetuity"]
    years: int | None = None


class NdaUpdates(BaseModel):
    """Fields the assistant wants to write to the document on this turn.

    Every field is optional. The frontend overwrites the corresponding field
    in its NdaFormData state when a non-null value is present.
    """

    party1: PartyPatch | None = None
    party2: PartyPatch | None = None
    purpose: str | None = None
    effectiveDate: str | None = None
    mndaTerm: MndaTermUpdate | None = None
    termOfConfidentiality: ConfTermUpdate | None = None
    governingLawState: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None


class ChatResponse(BaseModel):
    """A single assistant turn: a reply plus the field updates implied by the user's last message."""

    reply: str = Field(description="The assistant's natural-language reply to the user.")
    updates: NdaUpdates = Field(
        default_factory=NdaUpdates,
        description="Fields to write to the NDA. Omit keys with no new value.",
    )


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    currentData: dict


SYSTEM_PROMPT = """You help a user fill out a Mutual Non-Disclosure Agreement (MNDA).
You ask the user questions about the parties, purpose, dates, term, and governing law, and you populate
document fields based on their answers.

Fields you can write via the `updates` object:
- party1, party2: { company, signatoryName, signatoryTitle, noticeAddress } - the two parties to the NDA
- purpose: short description of why the parties are sharing information
- effectiveDate: ISO date string YYYY-MM-DD
- mndaTerm: { kind: "years", years: <int> } or { kind: "until-terminated" }
- termOfConfidentiality: { kind: "years", years: <int> } or { kind: "perpetuity" }
- governingLawState: US state name, e.g. "Delaware"
- jurisdiction: city or county and state, e.g. "New Castle, Delaware"
- modifications: optional free-text changes to the standard terms

Rules:
- Only include a field in `updates` when the user has just provided that info or wants to change it.
  Omit any field you have no new value for. Never invent values.
- For dates, output ISO YYYY-MM-DD.
- Ask one or two questions at a time, not all of them. Keep replies short and conversational.
- After writing a field, briefly confirm what you wrote, then ask the next question.
- If the user is finished or wants to wrap up, summarize what's filled and what's still missing.
"""


def _build_messages(req: ChatRequest) -> list[dict]:
    system = (
        SYSTEM_PROMPT
        + "\nCurrent document state (JSON):\n"
        + json.dumps(req.currentData, ensure_ascii=False)
    )
    out: list[dict] = [{"role": "system", "content": system}]
    for m in req.messages:
        out.append({"role": m.role, "content": m.content})
    return out


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENROUTER_API_KEY is not configured on the server.",
        )

    try:
        response = completion(
            model=MODEL,
            messages=_build_messages(req),
            response_format=ChatResponse,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        raw = response.choices[0].message.content
        return ChatResponse.model_validate_json(raw)
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"LLM call failed: {exc}") from exc
