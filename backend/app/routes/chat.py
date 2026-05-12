"""Conversational endpoint for drafting legal documents.

Three modes share one endpoint, switched by ``ChatRequest.documentId``:

* ``None`` -- the document selector. The assistant lists supported documents
  and recommends a closest match for unsupported requests. Returns
  ``selectedDocumentId`` once the user confirms a choice.
* ``"mutual-nda"`` -- the bespoke MNDA flow with the rich ``NdaUpdates``
  schema (parties, dates, terms, governing law). The frontend renders
  this with the hand-built ``NdaPreview`` component.
* any other supported id -- a generic flow whose Pydantic schema is
  built dynamically from the document's ``fields`` (every field is an
  optional string). The frontend renders this with ``GenericPreview``.

Wraps a LiteLLM -> OpenRouter -> Cerebras call configured to return a
structured response containing both the assistant's reply and a partial
update to the document fields. The frontend merges those updates into the
live document preview.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from litellm import completion
from pydantic import BaseModel, Field, create_model

from ..documents import DOCUMENTS, get_document

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
    """One assistant turn for the in-document flow."""

    reply: str = Field(description="The assistant's natural-language reply to the user.")
    updates: NdaUpdates = Field(
        default_factory=NdaUpdates,
        description="Fields to write to the NDA. Omit keys with no new value.",
    )


class GenericChatResponse(BaseModel):
    """One assistant turn for a generic (non-NDA) document flow.

    Concrete subclasses are built per-document in ``_generic_response_model``
    so the LLM's structured output is constrained to the document's fields.
    """

    reply: str = Field(description="The assistant's natural-language reply to the user.")
    # `updates` is replaced per-document via create_model.
    updates: dict[str, str | None] = Field(default_factory=dict)


class SelectorResponse(BaseModel):
    """One assistant turn for the document-selector mode."""

    reply: str = Field(description="The assistant's natural-language reply to the user.")
    selectedDocumentId: str | None = Field(
        default=None,
        description=(
            "Set to the catalog id of the document the user has confirmed. "
            "Leave null until the user explicitly agrees to one."
        ),
    )


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    currentData: dict[str, Any] = Field(default_factory=dict)
    documentId: str | None = None


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

NDA_SYSTEM_PROMPT = """You help a user fill out a Mutual Non-Disclosure Agreement (MNDA).
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
- Always end your reply with a follow-up question while any required field is still empty.
  Only stop asking questions once the document is complete and the user has signalled they're done.
- If the user is finished or wants to wrap up, summarize what's filled and what's still missing.
"""


def _selector_system_prompt() -> str:
    bullets = "\n".join(
        f"- {d.short_name} (id: {d.id}) -- {d.description}" for d in DOCUMENTS
    )
    return (
        "You are the document-selector for a legal-document drafting tool. "
        "Your job on this turn is to figure out which supported document the "
        "user wants to draft and confirm it with them.\n\n"
        "Supported documents:\n"
        f"{bullets}\n\n"
        "Rules:\n"
        "- If the user names something we don't support (e.g. 'employment "
        "  agreement', 'NDA between an individual and a company'), explain "
        "  briefly that we can't generate that exact document, and suggest "
        "  the closest supported one with a one-sentence reason.\n"
        "- Only set `selectedDocumentId` once the user has explicitly "
        "  confirmed a choice. Until then, leave it null and keep asking.\n"
        "- Keep replies short and conversational.\n"
        "- Always end your reply with a follow-up question until "
        "  `selectedDocumentId` is set."
    )


def _generic_system_prompt(doc_id: str) -> str:
    doc = get_document(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Unknown document id: {doc_id}")
    field_lines = "\n".join(
        f"- {f.name}: ({f.kind}) {f.label}"
        + (f" -- {f.placeholder}" if f.placeholder else "")
        for f in doc.fields
    )
    return (
        f"You help a user fill out a {doc.name}.\n"
        f"{doc.description}\n\n"
        "Ask the user questions in a friendly, conversational way and populate "
        "the document's cover-page fields based on their answers.\n\n"
        "Fields you can write via the `updates` object (every value is a string; "
        "use empty string '' to clear):\n"
        f"{field_lines}\n\n"
        "Rules:\n"
        "- Only include a field in `updates` when the user has just provided "
        "  that info or wants to change it. Omit fields you have no new value "
        "  for. Never invent values.\n"
        "- For date fields, output ISO YYYY-MM-DD.\n"
        "- Ask one or two questions at a time, not all of them. Keep replies "
        "  short and conversational.\n"
        "- After writing a field, briefly confirm what you wrote, then ask "
        "  the next question.\n"
        "- Always end your reply with a follow-up question while any field "
        "  is still empty. Only stop asking questions once the document is "
        "  complete and the user has signalled they're done.\n"
        "- If the user is finished or wants to wrap up, summarize what's "
        "  filled and what's still missing."
    )


# ---------------------------------------------------------------------------
# Schema builders
# ---------------------------------------------------------------------------


def _generic_response_model(doc_id: str) -> type[BaseModel]:
    """Build a per-document Pydantic response model.

    Each field becomes ``Optional[str]``. Pydantic + LiteLLM use this as the
    JSON schema the LLM must populate, so the model can only return values
    for fields the document actually has.
    """
    doc = get_document(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Unknown document id: {doc_id}")
    updates_fields: dict[str, Any] = {
        f.name: (str | None, Field(default=None, description=f.label))
        for f in doc.fields
    }
    UpdatesModel = create_model(  # type: ignore[call-overload]
        f"{doc.id.replace('-', '_')}_updates",
        __base__=BaseModel,
        **updates_fields,
    )
    ResponseModel = create_model(  # type: ignore[call-overload]
        f"{doc.id.replace('-', '_')}_response",
        __base__=BaseModel,
        reply=(str, Field(description="The assistant's natural-language reply to the user.")),
        updates=(UpdatesModel, Field(default_factory=UpdatesModel)),
    )
    return ResponseModel


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


def _build_messages(system_prompt: str, req: ChatRequest, include_state: bool) -> list[dict]:
    system = system_prompt
    if include_state:
        system = (
            system
            + "\nCurrent document state (JSON):\n"
            + json.dumps(req.currentData, ensure_ascii=False)
        )
    out: list[dict] = [{"role": "system", "content": system}]
    for m in req.messages:
        out.append({"role": m.role, "content": m.content})
    return out


def _call_llm(messages: list[dict], response_model: type[BaseModel]) -> Any:
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=response_model,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    raw = response.choices[0].message.content
    return response_model.model_validate_json(raw)


@router.post("/chat")
def chat(req: ChatRequest) -> Any:
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENROUTER_API_KEY is not configured on the server.",
        )

    try:
        if req.documentId is None:
            messages = _build_messages(_selector_system_prompt(), req, include_state=False)
            return _call_llm(messages, SelectorResponse)

        if req.documentId == "mutual-nda":
            messages = _build_messages(NDA_SYSTEM_PROMPT, req, include_state=True)
            return _call_llm(messages, ChatResponse)

        # Generic per-document flow.
        response_model = _generic_response_model(req.documentId)
        messages = _build_messages(_generic_system_prompt(req.documentId), req, include_state=True)
        return _call_llm(messages, response_model)
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"LLM call failed: {exc}") from exc
