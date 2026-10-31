"""Fatigue guard: flags long days, short rest, long streaks and heavy weeks."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.domain.models import Shift
from app.sectors import SectorConfig

LONG_DAY = "long_day"
SHORT_REST = "short_rest"
CONSECUTIVE_DAYS = "consecutive_days"
WEEKLY_CAP = "weekly_cap"


@dataclass(frozen=True)
class FatigueAlert:
    code: str
    severity: str  # "warning" | "danger"
    params: dict = field(default_factory=dict)


def hours_in_window(shifts: list[Shift], start: datetime, end: datetime) -> float:
    total = 0.0
    for shift in shifts:
        s_end = shift.end or end
        overlap = (min(s_end, end) - max(shift.start, start)).total_seconds()
        if overlap > 0:
            total += overlap / 3600
    return total


def evaluate(shifts: list[Shift], now: datetime, sector: SectorConfig) -> list[FatigueAlert]:
    """Return active fatigue alerts for one worker. An open shift counts up to `now`."""
    ordered = sorted(shifts, key=lambda s: s.start)
    if not ordered:
        return []
    alerts: list[FatigueAlert] = []

    day_hours = hours_in_window(ordered, now - timedelta(hours=24), now)
    if day_hours > sector.max_daily_hours:
        alerts.append(FatigueAlert(LONG_DAY, "danger", {"hours": round(day_hours, 1)}))

    if len(ordered) >= 2:
        previous, latest = ordered[-2], ordered[-1]
        if previous.end is not None and now - latest.start <= timedelta(hours=24):
            rest = (latest.start - previous.end).total_seconds() / 3600
            if 0 <= rest < sector.min_rest_hours:
                alerts.append(
                    FatigueAlert(
                        SHORT_REST,
                        "warning",
                        {"hours": round(rest, 1), "min": sector.min_rest_hours},
                    )
                )

    streak = consecutive_days(ordered, now)
    if streak > sector.max_consecutive_days:
        alerts.append(FatigueAlert(CONSECUTIVE_DAYS, "warning", {"days": streak}))

    week_hours = hours_in_window(ordered, now - timedelta(days=7), now)
    if week_hours > sector.weekly_hours_cap:
        alerts.append(
            FatigueAlert(
                WEEKLY_CAP,
                "danger",
                {"hours": round(week_hours, 1), "cap": sector.weekly_hours_cap},
            )
        )
    return alerts


def consecutive_days(shifts: list[Shift], now: datetime) -> int:
    """Number of back-to-back calendar days worked, ending today or yesterday."""
    worked = {s.start.date() for s in shifts}
    day = now.date()
    if day not in worked:
        day -= timedelta(days=1)
    streak = 0
    while day in worked:
        streak += 1
        day -= timedelta(days=1)
    return streak
