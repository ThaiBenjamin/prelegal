"""Password hashing, JWT issuance, and the FastAPI auth dependency.

Auth is intentionally simple for V1: bcrypt-hashed passwords, HS256 JWTs
stored client-side, no refresh tokens. The signing secret comes from the
``JWT_SECRET`` env var; if absent we generate an ephemeral one at import
time so dev sessions still work (tokens become invalid on every restart,
which is consistent with the DB being wiped on restart anyway).
"""

from __future__ import annotations

import os
import secrets
import time
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException

_JWT_ALGORITHM = "HS256"
_JWT_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


def _resolve_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if secret:
        return secret
    return secrets.token_urlsafe(32)


_SECRET = _resolve_secret()


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    now = int(time.time())
    payload = {"sub": str(user_id), "iat": now, "exp": now + _JWT_TTL_SECONDS}
    return jwt.encode(payload, _SECRET, algorithm=_JWT_ALGORITHM)


def _decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub.isdigit():
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return int(sub)


def current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> int:
    """FastAPI dependency that resolves the caller's user id from a bearer token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return _decode_token(token)


CurrentUserId = Annotated[int, Depends(current_user_id)]
