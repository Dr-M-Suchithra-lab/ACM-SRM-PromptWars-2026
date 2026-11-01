"""Payslip calculation: regular hours, overtime and night allowance.

Overtime follows the common Indian labour-law pattern used by the sector configs:
hours beyond the daily limit are overtime, and if the remaining regular hours in the
period still exceed the weekly limit, the excess becomes overtime too.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from app.domain.models import Shift
from app.sectors import SectorConfig


@dataclass(frozen=True)
class PayLine:
    key: str  # "basic" | "overtime" | "night"
    hours: float
    rate: float
    amount: float


@dataclass(frozen=True)
class Payslip:
    period_start: date
    period_end: date
    hours_worked: float
    regular_hours: float
    overtime_hours: float
    night_hours: float
    hourly_rate: float
    gross: float
    lines: list[PayLine] = field(default_factory=list)


def night_hours(start: datetime, end: datetime, window: tuple[int, int]) -> float:
    """Hours of [start, end) that fall inside the nightly window (start_hour, end_hour)."""
    if end <= start:
        return 0.0
    night_start, night_end = window
    total = 0.0
    day = start.date() - timedelta(days=1)
    while day <= end.date():
        base = datetime.combine(day, datetime.min.time(), tzinfo=start.tzinfo)
        w_start = base + timedelta(hours=night_start)
        w_end = base + timedelta(hours=night_end)
        if night_end <= night_start:
            w_end += timedelta(days=1)
        overlap = (min(end, w_end) - max(start, w_start)).total_seconds()
        if overlap > 0:
            total += overlap / 3600
        day += timedelta(days=1)
    return total


def split_hours(shifts: list[Shift], sector: SectorConfig) -> tuple[float, float]:
    """Return (regular_hours, overtime_hours) for completed shifts in one pay period."""
    per_day: dict[date, float] = defaultdict(float)
    for shift in shifts:
        if shift.end is not None:
            per_day[shift.start.date()] += shift.hours()

    regular = 0.0
    overtime = 0.0
    for hours in per_day.values():
        day_regular = min(hours, sector.daily_regular_hours)
        regular += day_regular
        overtime += hours - day_regular

    if regular > sector.weekly_regular_hours:
        overtime += regular - sector.weekly_regular_hours
        regular = sector.weekly_regular_hours
    return regular, overtime


def compute_payslip(
    shifts: list[Shift],
    hourly_rate: float,
    sector: SectorConfig,
    period_start: date,
    period_end: date,
) -> Payslip:
    completed = [
        s for s in shifts if s.end is not None and period_start <= s.start.date() <= period_end
    ]
    regular, overtime = split_hours(completed, sector)
    night = sum(night_hours(s.start, s.end, sector.night_window) for s in completed)

    ot_rate = hourly_rate * sector.overtime_multiplier
    lines = [
        PayLine("basic", _r(regular), hourly_rate, _r(regular * hourly_rate)),
        PayLine("overtime", _r(overtime), ot_rate, _r(overtime * ot_rate)),
        PayLine(
            "night",
            _r(night),
            sector.night_allowance_per_hour,
            _r(night * sector.night_allowance_per_hour),
        ),
    ]
    return Payslip(
        period_start=period_start,
        period_end=period_end,
        hours_worked=_r(regular + overtime),
        regular_hours=_r(regular),
        overtime_hours=_r(overtime),
        night_hours=_r(night),
        hourly_rate=hourly_rate,
        gross=_r(sum(line.amount for line in lines)),
        lines=lines,
    )


def week_bounds(day: date) -> tuple[date, date]:
    """Monday..Sunday of the week containing `day`."""
    monday = day - timedelta(days=day.weekday())
    return monday, monday + timedelta(days=6)


def _r(value: float) -> float:
    return round(value, 2)
