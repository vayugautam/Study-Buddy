"""Password hashing and JWT access-token helpers."""

import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()
_dummy_hash = password_hash.hash("not-a-real-user-password")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET") or os.getenv("JWT_SECRET_KEY")
    if not secret or len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be configured with at least 32 characters")
    return secret


def access_token_expiry_minutes() -> int:
    try:
        minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    except ValueError as exc:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be an integer") from exc
    if minutes <= 0:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be greater than zero")
    return minutes


def create_access_token(subject: UUID | str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=access_token_expiry_minutes()),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> UUID:
    payload = jwt.decode(
        token,
        _jwt_secret(),
        algorithms=[ALGORITHM],
        options={"require": ["exp", "iat", "sub"]},
    )
    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise jwt.InvalidTokenError("Invalid subject")
    try:
        return UUID(subject)
    except ValueError as exc:
        raise jwt.InvalidTokenError("Invalid subject") from exc


def verify_password_or_dummy(password: str, hashed_password: str | None) -> bool:
    """Verify even unknown accounts against a dummy hash to reduce timing leaks."""
    return password_hash.verify(password, hashed_password or _dummy_hash) and hashed_password is not None
