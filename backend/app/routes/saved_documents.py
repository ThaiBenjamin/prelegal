"""Per-user persistence of generated documents.

Each row is the full cover-page field map (JSON) plus a display title.
The chat transcript itself is not persisted -- reopening a saved
document rehydrates only the fields and starts a fresh chat thread.
"""

from __future__ import annotations

import json
import sqlite3
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ..auth import CurrentUserId
from ..db import get_connection
from ..documents import get_document

router = APIRouter()


class SavedDocumentSummary(BaseModel):
    id: int
    documentId: str
    title: str
    updatedAt: str


class SavedDocument(SavedDocumentSummary):
    fields: dict[str, Any]


class UpsertRequest(BaseModel):
    id: int | None = None
    documentId: str = Field(min_length=1)
    title: str = Field(min_length=1, max_length=200)
    fields: dict[str, Any] = Field(default_factory=dict)


def _row_to_summary(row: sqlite3.Row) -> SavedDocumentSummary:
    return SavedDocumentSummary(
        id=row["id"],
        documentId=row["document_id"],
        title=row["title"],
        updatedAt=row["updated_at"],
    )


def _row_to_full(row: sqlite3.Row) -> SavedDocument:
    return SavedDocument(
        id=row["id"],
        documentId=row["document_id"],
        title=row["title"],
        updatedAt=row["updated_at"],
        fields=json.loads(row["fields_json"]),
    )


@router.get("/saved-documents", response_model=list[SavedDocumentSummary])
def list_saved(user_id: CurrentUserId) -> list[SavedDocumentSummary]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, document_id, title, updated_at "
            "FROM saved_documents WHERE user_id = ? "
            "ORDER BY updated_at DESC, id DESC",
            (user_id,),
        ).fetchall()
    return [_row_to_summary(r) for r in rows]


@router.post("/saved-documents", response_model=SavedDocument)
def upsert(req: UpsertRequest, user_id: CurrentUserId) -> SavedDocument:
    if get_document(req.documentId) is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown document id: {req.documentId}"
        )
    fields_json = json.dumps(req.fields, ensure_ascii=False)
    title = req.title.strip() or "Untitled"
    with get_connection() as conn:
        if req.id is not None:
            cur = conn.execute(
                "UPDATE saved_documents "
                "SET document_id = ?, title = ?, fields_json = ?, "
                "    updated_at = CURRENT_TIMESTAMP "
                "WHERE id = ? AND user_id = ?",
                (req.documentId, title, fields_json, req.id, user_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Saved document not found")
            row_id = req.id
        else:
            cur = conn.execute(
                "INSERT INTO saved_documents "
                "(user_id, document_id, title, fields_json) VALUES (?, ?, ?, ?)",
                (user_id, req.documentId, title, fields_json),
            )
            row_id = cur.lastrowid
        row = conn.execute(
            "SELECT id, document_id, title, fields_json, updated_at "
            "FROM saved_documents WHERE id = ?",
            (row_id,),
        ).fetchone()
    return _row_to_full(row)


@router.get("/saved-documents/{doc_row_id}", response_model=SavedDocument)
def get_saved(doc_row_id: int, user_id: CurrentUserId) -> SavedDocument:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, document_id, title, fields_json, updated_at "
            "FROM saved_documents WHERE id = ? AND user_id = ?",
            (doc_row_id, user_id),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Saved document not found")
    return _row_to_full(row)


@router.delete("/saved-documents/{doc_row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved(doc_row_id: int, user_id: CurrentUserId) -> None:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM saved_documents WHERE id = ? AND user_id = ?",
            (doc_row_id, user_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Saved document not found")
