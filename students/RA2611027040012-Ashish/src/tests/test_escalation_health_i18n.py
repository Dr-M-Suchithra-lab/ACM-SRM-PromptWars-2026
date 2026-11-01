from datetime import date, timedelta

import pytest

from app.domain.escalation import FIXED, REPORTED, SEEN, can_transition, due_at, is_escalated
from app.domain.fatigue import LONG_DAY, FatigueAlert
from app.domain.health import AT_RISK, HEALTHY, WATCH, TeamMetrics, compute_health
from app.domain.i18n import alert_message, normalize_language, payslip_sentence
from app.domain.pay import Payslip
from tests.helpers import at

SLA = {"critical": 2, "high": 24, "medium": 72, "low": 168}


# --- escalation -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("current", "new", "ok"),
    [
        (REPORTED, SEEN, True),
        (REPORTED, FIXED, True),
        (SEEN, FIXED, True),
        (SEEN, REPORTED, False),
        (FIXED, SEEN, False),
        (REPORTED, "deleted", False),
    ],
)
def test_status_transitions(current, new, ok):
    assert can_transition(current, new) is ok


def test_critical_report_escalates_after_sla():
    created = at(1, 9)
    assert due_at(created, "critical", SLA) == created + timedelta(hours=2)
    assert not is_escalated(REPORTED, "critical", created, at(1, 10), SLA)
    assert is_escalated(REPORTED, "critical", created, at(1, 12), SLA)


def test_acknowledged_report_does_not_escalate():
    assert not is_escalated(SEEN, "critical", at(1, 9), at(3, 9), SLA)


# --- health -------------------------------------------------------------------


def metrics(**overrides):
    base = dict(
        team_size=8,
        total_hours=400,
        overtime_hours=20,
        fatigued_workers=0,
        open_reports=0,
        escalated_reports=0,
        attendance_this_week=0.95,
        attendance_last_week=0.95,
    )
    return TeamMetrics(**{**base, **overrides})


def test_healthy_team_scores_100():
    result = compute_health(metrics())
    assert result.score == 100
    assert result.band == HEALTHY
    assert result.reasons == ["No warning signs this week"]


def test_small_team_is_hidden_for_privacy():
    result = compute_health(metrics(team_size=4))
    assert result.hidden and result.score is None


def test_overworked_team_is_at_risk_with_reasons():
    result = compute_health(
        metrics(
            overtime_hours=140,  # 35%
            fatigued_workers=4,
            open_reports=3,
            escalated_reports=1,
            attendance_this_week=0.80,
        )
    )
    assert result.band == AT_RISK
    assert len(result.reasons) == 5
    assert any("Overtime is 35%" in r for r in result.reasons)


def test_moderate_issues_put_team_on_watch():
    # 25% overtime (-15), 3 of 8 fatigued (-15), 2 open reports (-6) -> 64
    result = compute_health(metrics(overtime_hours=100, fatigued_workers=3, open_reports=2))
    assert result.score == 64
    assert result.band == WATCH


# --- i18n ---------------------------------------------------------------------


SLIP = Payslip(
    period_start=date(2026, 6, 1),
    period_end=date(2026, 6, 7),
    hours_worked=52.0,
    regular_hours=48.0,
    overtime_hours=4.0,
    night_hours=0.0,
    hourly_rate=100,
    gross=5600.0,
)


@pytest.mark.parametrize(
    ("lang", "fragment"), [("en", "52 hours"), ("hi", "52 घंटे"), ("ta", "52 மணி")]
)
def test_payslip_sentence_in_each_language(lang, fragment):
    sentence = payslip_sentence(SLIP, lang)
    assert fragment in sentence
    assert "5,600" in sentence


def test_unknown_language_falls_back_to_english():
    assert normalize_language("fr") == "en"
    assert normalize_language(None) == "en"


def test_alert_message_formats_numbers():
    alert = FatigueAlert(LONG_DAY, "danger", {"hours": 13.0})
    assert "13 hours" in alert_message(alert, "en")
    assert "13 घंटे" in alert_message(alert, "hi")
