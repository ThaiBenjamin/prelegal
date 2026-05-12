"""Sign-up, sign-in, and identity endpoints.

The user table is recreated on every server start (CLAUDE.md: the DB
resets on restart), so accounts only persist for the lifetime of a
single container. Sessions are stateless JWTs.
"""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ..auth import (
    CurrentUserId,
    create_token,
    hash_password,
    verify_password,
)
from ..db import get_connection

router = APIRouter()


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class SigninRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserPayload(BaseModel):
    id: int
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserPayload


def _user_payload(row: sqlite3.Row) -> UserPayload:
    return UserPayload(id=row["id"], name=row["name"], email=row["email"])


@router.post("/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest) -> AuthResponse:
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    email = req.email.lower()
    hashed = hash_password(req.password)
    with get_connection() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email, hashed),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(
                status_code=409,
                detail="An account with that email already exists.",
            ) from exc
        user_id = cur.lastrowid
        row = conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return AuthResponse(token=create_token(user_id), user=_user_payload(row))


@router.post("/auth/signin", response_model=AuthResponse)
def signin(req: SigninRequest) -> AuthResponse:
    email = req.email.lower()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    if row is None or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return AuthResponse(token=create_token(row["id"]), user=_user_payload(row))


@router.get("/auth/me", response_model=UserPayload)
def me(user_id: CurrentUserId) -> UserPayload:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return _user_payload(row)
