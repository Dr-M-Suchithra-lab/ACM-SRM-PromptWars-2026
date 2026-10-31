from datetime import timedelta

from app.domain.fatigue import (
    CONSECUTIVE_DAYS,
    LONG_DAY,
    SHORT_REST,
    WEEKLY_CAP,
    consecutive_days,
    evaluate,
)
from app.domain.models import Shift
from app.sectors import get_sector
from tests.helpers import at, shift

SECTOR = get_sector("construction")  # max 12h/day, 10h rest, 6 days, 60h/week


def codes(alerts):
    return {a.code for a in alerts}


def test_normal_shift_has_no_alerts():
    assert evaluate([shift(1, 8, 8)], at(1, 18), SECTOR) == []


def test_no_shifts_has_no_alerts():
    assert evaluate([], at(1, 18), SECTOR) == []


def test_long_day_is_flagged():
    alerts = evaluate([shift(1, 6, 13)], at(1, 20), SECTOR)
    assert LONG_DAY in codes(alerts)


def test_open_shift_counts_until_now():
    open_shift = Shift(worker_id="w1", start=at(1, 6))
    assert codes(evaluate([open_shift], at(1, 19), SECTOR)) == {LONG_DAY}


def test_short_rest_between_shifts_is_flagged():
    shifts = [shift(1, 8, 9), shift(1, 23, 4)]  # ended 17:00, back at 23:00 -> 6h rest
    alerts = evaluate(shifts, at(2, 4), SECTOR)
    rest = next(a for a in alerts if a.code == SHORT_REST)
    assert rest.params == {"hours": 6.0, "min": SECTOR.min_rest_hours}


def test_old_short_rest_no_longer_alerts():
    shifts = [shift(1, 8, 9), shift(1, 23, 4)]
    assert SHORT_REST not in codes(evaluate(shifts, at(4, 12), SECTOR))


def test_seven_days_in_a_row_is_flagged():
    shifts = [shift(d, 8, 8) for d in range(1, 8)]
    assert CONSECUTIVE_DAYS in codes(evaluate(shifts, at(7, 18), SECTOR))


def test_streak_counts_from_yesterday_if_not_working_today():
    shifts = [shift(d, 8, 8) for d in range(1, 4)]
    assert consecutive_days(shifts, at(4, 9)) == 3
    assert consecutive_days(shifts, at(6, 9)) == 0


def test_heavy_week_is_flagged():
    shifts = [shift(d, 7, 11) for d in range(1, 7)]  # 66h
    alerts = evaluate(shifts, at(6, 20), SECTOR)
    assert WEEKLY_CAP in codes(alerts)


def test_hours_older_than_a_week_are_ignored():
    shifts = [shift(1, 7, 11)]
    later = at(1, 7) + timedelta(days=9)
    assert evaluate(shifts, later, SECTOR) == []
