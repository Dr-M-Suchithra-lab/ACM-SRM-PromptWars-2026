"""Single source of 'now'. All times are India Standard Time (fixed UTC+05:30)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def now() -> datetime:
    return datetime.now(IST)
