"""Team-level workforce health score with plain-language reasons.

Scores are only computed for groups of at least MIN_GROUP_SIZE workers, so no
individual can be singled out. This is an early-warning signal for burnout and
attrition risk, not a tool for monitoring individuals.
"""

from __future__ import annotations

from dataclasses import dataclass, field

MIN_GROUP_SIZE = 5
OVERTIME_TARGET = 0.10

HEALTHY = "healthy"
WATCH = "watch"
AT_RISK = "at_risk"


@dataclass(frozen=True)
class TeamMetrics:
    team_size: int
    total_hours: float
    overtime_hours: float
    fatigued_workers: int
    open_reports: int
    escalated_reports: int
    attendance_this_week: float  # 0..1
    attendance_last_week: float  # 0..1


@dataclass(frozen=True)
class HealthResult:
    score: int | None
    band: str | None
    reasons: list[str] = field(default_factory=list)
    hidden: bool = False


def compute_health(m: TeamMetrics) -> HealthResult:
    if m.team_size < MIN_GROUP_SIZE:
        return HealthResult(
            score=None,
            band=None,
            reasons=[f"Hidden to protect privacy: fewer than {MIN_GROUP_SIZE} workers"],
            hidden=True,
        )

    score = 100.0
    reasons: list[str] = []

    ot_share = m.overtime_hours / m.total_hours if m.total_hours else 0.0
    if ot_share > OVERTIME_TARGET:
        score -= min(25.0, (ot_share - OVERTIME_TARGET) * 100)
        reasons.append(
            f"Overtime is {ot_share:.0%} of hours worked (target under {OVERTIME_TARGET:.0%})"
        )

    if m.fatigued_workers:
        score -= min(30.0, m.fatigued_workers / m.team_size * 40)
        reasons.append(f"{m.fatigued_workers} of {m.team_size} workers have fatigue warnings")

    if m.open_reports:
        score -= min(15.0, m.open_reports * 3)
        reasons.append(f"Open safety or welfare reports: {m.open_reports}")

    if m.escalated_reports:
        score -= min(20.0, m.escalated_reports * 10)
        reasons.append(f"Reports past their response deadline: {m.escalated_reports}")

    drop = m.attendance_last_week - m.attendance_this_week
    if drop > 0.05:
        score -= min(10.0, drop * 100)
        reasons.append(
            f"Attendance fell from {m.attendance_last_week:.0%} to {m.attendance_this_week:.0%}"
        )

    if not reasons:
        reasons.append("No warning signs this week")

    final = max(0, round(score))
    return HealthResult(score=final, band=band_for(final), reasons=reasons)


def band_for(score: int) -> str:
    if score >= 75:
        return HEALTHY
    if score >= 50:
        return WATCH
    return AT_RISK
