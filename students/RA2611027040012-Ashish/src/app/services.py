"""Application services: combine the store with the pure business rules.

The API layer stays thin and calls into these functions; they are tested directly.
"""

from __future__ import annotations

import math
from dataclasses import asdict
from datetime import date, datetime, timedelta

from app.domain import escalation, fatigue, health, i18n, pay, sitecode
from app.domain.models import Shift
from app.sectors import SectorConfig, get_sector
from app.store.memory import MemoryStore, Report, Site, Worker

EXPECTED_DAYS_PER_WEEK = 6


class ServiceError(Exception):
    """A user-facing rule violation (wrong code, shift already started, ...)."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def sector_for(store: MemoryStore, site_id: str) -> SectorConfig:
    return get_sector(store.sites[site_id].sector_id)


# --- check-in -------------------------------------------------------------------------


def start_shift_with_code(
    store: MemoryStore,
    worker: Worker,
    code: str,
    secret: str,
    now: datetime,
    lat: float | None = None,
    lon: float | None = None,
) -> Shift:
    if not sitecode.verify(secret, worker.site_id, code, now):
        raise ServiceError("bad_code", "That site code is not correct or has expired.")
    site = store.sites[worker.site_id]
    on_site = lat is not None and lon is not None and _within(site, lat, lon)
    return _start(store, Shift(worker.id, now, None, "code", on_site))


def roll_call(store: MemoryStore, site_id: str, worker_ids: list[str], now: datetime) -> int:
    """Supervisor marks workers present (for workers without a usable phone)."""
    started = 0
    for worker_id in worker_ids:
        worker = store.workers.get(worker_id)
        if worker is None or worker.site_id != site_id or store.open_shift(worker_id):
            continue
        _start(store, Shift(worker_id, now, None, "rollcall", False))
        started += 1
    return started


def end_shift(store: MemoryStore, worker: Worker, now: datetime) -> Shift:
    try:
        return store.end_shift(worker.id, now)
    except ValueError:
        raise ServiceError("no_shift", "You have not started a shift.") from None


def _start(store: MemoryStore, shift: Shift) -> Shift:
    try:
        return store.start_shift(shift)
    except ValueError:
        raise ServiceError("already_started", "Your shift has already started.") from None


def _within(site: Site, lat: float, lon: float) -> bool:
    """Equirectangular distance is accurate enough at site scale (< a few km)."""
    radius = 6_371_000
    x = math.radians(lon - site.lon) * math.cos(math.radians((lat + site.lat) / 2))
    y = math.radians(lat - site.lat)
    return math.hypot(x, y) * radius <= site.radius_m


# --- worker views ---------------------------------------------------------------------


def worker_status(store: MemoryStore, worker: Worker, now: datetime) -> dict:
    sector = sector_for(store, worker.site_id)
    shifts = store.shifts_for(worker.id)
    current = store.open_shift(worker.id)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start, _ = pay.week_bounds(now.date())
    week_start_dt = today_start - timedelta(days=(now.date() - week_start).days)
    alerts = fatigue.evaluate(shifts, now, sector)
    return {
        "on_shift": current is not None,
        "shift_started_at": current.start.isoformat() if current else None,
        "hours_today": round(fatigue.hours_in_window(shifts, today_start, now), 2),
        "hours_this_week": round(fatigue.hours_in_window(shifts, week_start_dt, now), 2),
        "days_in_a_row": fatigue.consecutive_days(shifts, now),
        "alerts": [
            {
                "code": a.code,
                "severity": a.severity,
                "message": i18n.alert_message(a, worker.lang),
            }
            for a in alerts
        ],
    }


def worker_payslip(store: MemoryStore, worker: Worker, day: date) -> dict:
    sector = sector_for(store, worker.site_id)
    start, end = pay.week_bounds(day)
    slip = pay.compute_payslip(store.shifts_for(worker.id), worker.hourly_rate, sector, start, end)
    data = asdict(slip)
    data["period_start"] = start.isoformat()
    data["period_end"] = end.isoformat()
    data["currency"] = sector.currency
    data["overtime_multiplier"] = sector.overtime_multiplier
    data["sentence"] = i18n.payslip_sentence(slip, worker.lang)
    return data


# --- reports --------------------------------------------------------------------------


def report_view(report: Report, sector: SectorConfig, now: datetime, manager: bool) -> dict:
    view = {
        "id": report.id,
        "status": report.status,
        "category": report.category,
        "severity": report.severity,
        "summary": report.summary,
        "transcript": report.transcript,
        "created_at": report.created_at.isoformat(),
        "due_at": escalation.due_at(
            report.created_at, report.severity, sector.sla_hours
        ).isoformat(),
        "escalated": escalation.is_escalated(
            report.status, report.severity, report.created_at, now, sector.sla_hours
        ),
        "history": [{"status": s, "at": t.isoformat()} for s, t in report.history],
    }
    if manager:
        view["original_lang"] = report.original_lang
        view["source"] = report.source
        view["anonymous"] = report.worker_id is None
    return view


def change_report_status(
    store: MemoryStore, site_id: str, report_id: str, status: str, now: datetime
) -> Report:
    report = store.reports.get(report_id)
    if report is None or report.site_id != site_id:
        raise ServiceError("not_found", "Report not found.", 404)
    if not escalation.can_transition(report.status, status):
        raise ServiceError("bad_status", f"Cannot move a {report.status} report to {status}.")
    return store.update_report_status(report_id, status, now)


# --- manager dashboard ----------------------------------------------------------------


def dashboard(store: MemoryStore, site_id: str, now: datetime) -> dict:
    site = store.sites[site_id]
    sector = get_sector(site.sector_id)
    reports = store.reports_at(site_id)
    teams = []
    totals = {"on_shift": 0, "workers": 0, "overtime_hours": 0.0, "fatigued": 0}

    for team in store.teams_at(site_id):
        members = store.workers_in(team.id)
        team_shifts = {w.id: store.shifts_for(w.id) for w in members}
        metrics, fatigued, on_shift = _team_metrics(
            members, team_shifts, reports, team.id, sector, now
        )
        result = health.compute_health(metrics)
        teams.append(
            {
                "id": team.id,
                "name": team.name,
                "size": len(members),
                "on_shift": on_shift,
                "fatigued": fatigued if not result.hidden else None,
                "overtime_hours": round(metrics.overtime_hours, 1),
                "health": asdict(result),
            }
        )
        totals["workers"] += len(members)
        totals["on_shift"] += on_shift
        totals["overtime_hours"] += metrics.overtime_hours
        totals["fatigued"] += fatigued

    open_reports = [r for r in reports if r.status != escalation.FIXED]
    escalated = [
        r
        for r in open_reports
        if escalation.is_escalated(r.status, r.severity, r.created_at, now, sector.sla_hours)
    ]
    return {
        "site": {"id": site.id, "name": site.name, "city": site.city},
        "sector": {"id": sector.id, "name": sector.name},
        "kpis": {
            "workers": totals["workers"],
            "on_shift": totals["on_shift"],
            "overtime_hours_7d": round(totals["overtime_hours"], 1),
            "fatigue_alerts": totals["fatigued"],
            "open_reports": len(open_reports),
            "escalated_reports": len(escalated),
        },
        "teams": teams,
        "attendance_trend": _attendance_trend(store, site_id, now),
        "min_group_size": health.MIN_GROUP_SIZE,
    }


def _team_metrics(
    members: list[Worker],
    team_shifts: dict[str, list[Shift]],
    reports: list[Report],
    team_id: str,
    sector: SectorConfig,
    now: datetime,
) -> tuple[health.TeamMetrics, int, int]:
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    total_hours = overtime_hours = 0.0
    fatigued = on_shift = 0
    days_this_week = days_last_week = 0

    for worker in members:
        shifts = team_shifts[worker.id]
        recent = [s for s in shifts if s.end is not None and s.start >= week_ago]
        regular, overtime = pay.split_hours(recent, sector)
        total_hours += regular + overtime
        overtime_hours += overtime
        if fatigue.evaluate(shifts, now, sector):
            fatigued += 1
        if shifts and shifts[-1].end is None:
            on_shift += 1
        days_this_week += len({s.start.date() for s in shifts if s.start >= week_ago})
        days_last_week += len(
            {s.start.date() for s in shifts if two_weeks_ago <= s.start < week_ago}
        )

    team_reports = [r for r in reports if r.team_id == team_id and r.status != escalation.FIXED]
    expected = max(1, len(members) * EXPECTED_DAYS_PER_WEEK)
    metrics = health.TeamMetrics(
        team_size=len(members),
        total_hours=total_hours,
        overtime_hours=overtime_hours,
        fatigued_workers=fatigued,
        open_reports=len(team_reports),
        escalated_reports=sum(
            escalation.is_escalated(r.status, r.severity, r.created_at, now, sector.sla_hours)
            for r in team_reports
        ),
        attendance_this_week=min(1.0, days_this_week / expected),
        attendance_last_week=min(1.0, days_last_week / expected),
    )
    return metrics, fatigued, on_shift


def _attendance_trend(store: MemoryStore, site_id: str, now: datetime, days: int = 14) -> list:
    """Share of the site's workforce that worked on each of the last `days` days."""
    workers = [w for w in store.workers.values() if w.site_id == site_id]
    worked_by_day: dict[date, int] = {}
    for worker in workers:
        for d in {s.start.date() for s in store.shifts_for(worker.id)}:
            worked_by_day[d] = worked_by_day.get(d, 0) + 1
    trend = []
    for offset in range(days - 1, -1, -1):
        d = now.date() - timedelta(days=offset)
        rate = worked_by_day.get(d, 0) / len(workers) if workers else 0
        trend.append({"date": d.isoformat(), "rate": round(rate, 3)})
    return trend


def roster(store: MemoryStore, site_id: str) -> list[dict]:
    rows = []
    for team in store.teams_at(site_id):
        for worker in store.workers_in(team.id):
            rows.append(
                {
                    "id": worker.id,
                    "name": worker.name,
                    "team": team.name,
                    "on_shift": store.open_shift(worker.id) is not None,
                }
            )
    return rows
