from datetime import date

import pytest

from app.domain.models import Shift
from app.domain.pay import compute_payslip, night_hours, split_hours, week_bounds
from app.sectors import get_sector
from tests.helpers import at, shift

CONSTRUCTION = get_sector("construction")  # 9h/day, 48h/week, OT x2
HOSPITAL = get_sector("hospital")  # 12h/day, 48h/week, OT x1.5


def test_regular_day_has_no_overtime():
    assert split_hours([shift(1, 8, 8)], CONSTRUCTION) == (8, 0)


def test_hours_beyond_daily_limit_are_overtime():
    assert split_hours([shift(1, 8, 11)], CONSTRUCTION) == (9, 2)


def test_same_hours_are_regular_in_a_sector_with_longer_shifts():
    assert split_hours([shift(1, 8, 11)], HOSPITAL) == (11, 0)


def test_two_shifts_on_one_day_are_added_before_the_daily_limit():
    regular, overtime = split_hours([shift(1, 6, 6), shift(1, 14, 5)], CONSTRUCTION)
    assert (regular, overtime) == (9, 2)


def test_weekly_limit_moves_excess_regular_hours_to_overtime():
    week = [shift(d, 8, 9) for d in range(1, 7)]  # 6 x 9h = 54h, no daily OT
    assert split_hours(week, CONSTRUCTION) == (48, 6)


def test_open_shift_is_not_paid_yet():
    open_shift = Shift(worker_id="w1", start=at(1, 8))
    assert split_hours([open_shift], CONSTRUCTION) == (0, 0)


@pytest.mark.parametrize(
    ("start", "hours", "expected"),
    [
        (8, 8, 0),  # day shift
        (22, 8, 8),  # 22:00-06:00 fully at night
        (18, 8, 4),  # 18:00-02:00 -> 4h after 22:00
        (4, 4, 2),  # 04:00-08:00 -> 2h before 06:00
    ],
)
def test_night_hours(start, hours, expected):
    s = shift(2, start, hours)
    assert night_hours(s.start, s.end, CONSTRUCTION.night_window) == pytest.approx(expected)


def test_payslip_lines_and_total():
    shifts = [shift(1, 8, 11), shift(2, 20, 8)]  # 9h + 2h OT; then 20:00-04:00
    slip = compute_payslip(shifts, 100, CONSTRUCTION, date(2026, 6, 1), date(2026, 6, 7))

    assert slip.regular_hours == 17
    assert slip.overtime_hours == 2
    assert slip.hours_worked == 19
    assert slip.night_hours == 6  # 20:00-04:00 overlaps 22:00-04:00
    by_key = {line.key: line for line in slip.lines}
    assert by_key["basic"].amount == 1700
    assert by_key["overtime"].rate == 200
    assert by_key["overtime"].amount == 400
    assert by_key["night"].amount == 6 * CONSTRUCTION.night_allowance_per_hour
    assert slip.gross == 1700 + 400 + 150


def test_payslip_ignores_shifts_outside_period():
    shifts = [shift(1, 8, 8), shift(9, 8, 8)]
    slip = compute_payslip(shifts, 100, CONSTRUCTION, date(2026, 6, 1), date(2026, 6, 7))
    assert slip.hours_worked == 8


def test_week_bounds_are_monday_to_sunday():
    assert week_bounds(date(2026, 6, 4)) == (date(2026, 6, 1), date(2026, 6, 7))
