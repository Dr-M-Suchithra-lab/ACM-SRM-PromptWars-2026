from datetime import timedelta

from app.domain.sitecode import WINDOW_SECONDS, code_for, seconds_remaining, verify
from tests.helpers import at

SECRET = "test-secret"
NOW = at(1, 9)


def test_code_is_four_digits():
    code = code_for(SECRET, "site-a", NOW)
    assert len(code) == 4 and code.isdigit()


def test_current_code_is_accepted():
    assert verify(SECRET, "site-a", code_for(SECRET, "site-a", NOW), NOW)


def test_previous_window_code_is_accepted():
    old = code_for(SECRET, "site-a", NOW - timedelta(seconds=WINDOW_SECONDS))
    assert verify(SECRET, "site-a", old, NOW)


def test_expired_code_is_rejected():
    old = code_for(SECRET, "site-a", NOW - timedelta(seconds=3 * WINDOW_SECONDS))
    current = code_for(SECRET, "site-a", NOW)
    previous = code_for(SECRET, "site-a", NOW - timedelta(seconds=WINDOW_SECONDS))
    if old not in (current, previous):  # 1-in-10,000 chance of a collision
        assert not verify(SECRET, "site-a", old, NOW)


def test_codes_differ_between_sites():
    codes = {code_for(SECRET, f"site-{i}", NOW) for i in range(20)}
    assert len(codes) > 15


def test_malformed_codes_are_rejected():
    for bad in ("", "123", "12345", "abcd", "12 4"):
        assert not verify(SECRET, "site-a", bad, NOW)


def test_seconds_remaining_is_within_window():
    assert 0 < seconds_remaining(NOW) <= WINDOW_SECONDS
