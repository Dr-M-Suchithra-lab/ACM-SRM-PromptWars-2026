"""Rotating 4-digit site code (TOTP-style).

The supervisor's screen shows the code; workers type it to check in. Because the code
changes every few minutes, a worker who is not on site cannot reuse an old one. No QR
scanning or camera is needed, so it works on any phone.
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime

WINDOW_SECONDS = 300


def _counter(at: datetime, window: int) -> int:
    return int(at.timestamp()) // window


def _code(secret: str, site_id: str, counter: int) -> str:
    digest = hmac.new(secret.encode(), f"{site_id}:{counter}".encode(), hashlib.sha256).digest()
    return f"{int.from_bytes(digest[:4], 'big') % 10_000:04d}"


def code_for(secret: str, site_id: str, at: datetime, window: int = WINDOW_SECONDS) -> str:
    return _code(secret, site_id, _counter(at, window))


def verify(
    secret: str, site_id: str, code: str, at: datetime, window: int = WINDOW_SECONDS
) -> bool:
    """Accept the current code and the previous one (grace for slow typing)."""
    if not (len(code) == 4 and code.isdigit()):
        return False
    counter = _counter(at, window)
    return any(hmac.compare_digest(code, _code(secret, site_id, c)) for c in (counter, counter - 1))


def seconds_remaining(at: datetime, window: int = WINDOW_SECONDS) -> int:
    return window - int(at.timestamp()) % window
