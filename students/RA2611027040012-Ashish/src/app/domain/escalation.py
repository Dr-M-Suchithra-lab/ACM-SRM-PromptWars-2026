"""Safety and grievance report lifecycle: Reported -> Seen -> Fixed, with SLA escalation."""

from __future__ import annotations

from datetime import datetime, timedelta

REPORTED = "reported"
SEEN = "seen"
FIXED = "fixed"
STATUSES = (REPORTED, SEEN, FIXED)
SEVERITIES = ("critical", "high", "medium", "low")

_ALLOWED = {
    REPORTED: {SEEN, FIXED},
    SEEN: {FIXED},
    FIXED: set(),
}


def can_transition(current: str, new: str) -> bool:
    return new in _ALLOWED.get(current, set())


def due_at(created_at: datetime, severity: str, sla_hours: dict[str, float]) -> datetime:
    return created_at + timedelta(hours=sla_hours[severity])


def is_escalated(
    status: str,
    severity: str,
    created_at: datetime,
    now: datetime,
    sla_hours: dict[str, float],
) -> bool:
    """A report escalates when nobody has acknowledged it before its deadline."""
    return status == REPORTED and now > due_at(created_at, severity, sla_hours)
