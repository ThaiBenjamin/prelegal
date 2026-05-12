"""Lists supported documents and serves their standard-terms markdown."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from ..documents import document_summaries, get_document

router = APIRouter()

# Templates ship inside the Docker image at /app/templates and live at the
# project root in local dev. Resolve relative to this file's location.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


@router.get("/documents")
def list_documents() -> list[dict]:
    return document_summaries()


@router.get("/documents/{doc_id}/standard-terms", response_class=PlainTextResponse)
def get_standard_terms(doc_id: str) -> str:
    doc = get_document(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Unknown document id: {doc_id}")
    candidates = [
        Path("/app") / doc.standard_terms_path,
        _PROJECT_ROOT / doc.standard_terms_path,
    ]
    for path in candidates:
        if path.is_file():
            return path.read_text(encoding="utf-8")
    raise HTTPException(
        status_code=500,
        detail=f"Template file missing on disk: {doc.standard_terms_path}",
    )
