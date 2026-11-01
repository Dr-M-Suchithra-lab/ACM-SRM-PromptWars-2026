"""Thread-safe in-memory store.

The prototype keeps data in memory and reseeds demo data on start-up, so every judge
sees the same story. All persistence goes through this class, so swapping it for a
Firestore-backed implementation does not touch the API or business rules.
"""

from __future__ import annotations

import secrets
import threading
from dataclasses import dataclass, field, replace
from datetime import datetime

from app.domain.models import Shift


@dataclass(frozen=True)
class Site:
    id: str
    name: str
    sector_id: str
    city: str
    lat: float
    lon: float
    radius_m: int = 500


@dataclass(frozen=True)
class Team:
    id: str
    site_id: str
    name: str


@dataclass
class Worker:
    id: str
    name: str
    phone: str
    pin_hash: str
    site_id: str
    team_id: str
    hourly_rate: float
    lang: str = "en"


@dataclass(frozen=True)
class Manager:
    id: str
    name: str
    email: str
    password_hash: str
    site_id: str


@dataclass
class Report:
    id: str
    site_id: str
    team_id: str
    worker_id: str | None  # None when anonymous: identity is never stored
    tracking_token: str
    source: str  # "voice" | "text"
    original_lang: str
    transcript: str
    summary: str
    category: str
    severity: str
    created_at: datetime
    status: str = "reported"
    updated_at: datetime | None = None
    history: list[tuple[str, datetime]] = field(default_factory=list)


class MemoryStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.sites: dict[str, Site] = {}
        self.teams: dict[str, Team] = {}
        self.workers: dict[str, Worker] = {}
        self.managers: dict[str, Manager] = {}
        self.reports: dict[str, Report] = {}
        self._shifts: dict[str, list[Shift]] = {}

    # --- people & places -----------------------------------------------------------

    def add_site(self, site: Site) -> None:
        self.sites[site.id] = site

    def add_team(self, team: Team) -> None:
        self.teams[team.id] = team

    def add_worker(self, worker: Worker) -> None:
        self.workers[worker.id] = worker
        self._shifts.setdefault(worker.id, [])

    def add_manager(self, manager: Manager) -> None:
        self.managers[manager.id] = manager

    def worker_by_phone(self, phone: str) -> Worker | None:
        return next((w for w in self.workers.values() if w.phone == phone), None)

    def manager_by_email(self, email: str) -> Manager | None:
        email = email.strip().lower()
        return next((m for m in self.managers.values() if m.email == email), None)

    def teams_at(self, site_id: str) -> list[Team]:
        return [t for t in self.teams.values() if t.site_id == site_id]

    def workers_in(self, team_id: str) -> list[Worker]:
        return [w for w in self.workers.values() if w.team_id == team_id]

    def set_language(self, worker_id: str, lang: str) -> None:
        with self._lock:
            self.workers[worker_id].lang = lang

    # --- shifts --------------------------------------------------------------------

    def shifts_for(self, worker_id: str) -> list[Shift]:
        with self._lock:
            return list(self._shifts.get(worker_id, []))

    def open_shift(self, worker_id: str) -> Shift | None:
        shifts = self._shifts.get(worker_id, [])
        return shifts[-1] if shifts and shifts[-1].end is None else None

    def start_shift(self, shift: Shift) -> Shift:
        with self._lock:
            if self.open_shift(shift.worker_id):
                raise ValueError("Shift already in progress")
            self._shifts[shift.worker_id].append(shift)
            return shift

    def end_shift(self, worker_id: str, at: datetime) -> Shift:
        with self._lock:
            current = self.open_shift(worker_id)
            if current is None:
                raise ValueError("No shift in progress")
            ended = replace(current, end=max(at, current.start))
            self._shifts[worker_id][-1] = ended
            return ended

    def add_history(self, shifts: list[Shift]) -> None:
        with self._lock:
            for shift in shifts:
                self._shifts[shift.worker_id].append(shift)
            for worker_shifts in self._shifts.values():
                worker_shifts.sort(key=lambda s: s.start)

    # --- reports -------------------------------------------------------------------

    def add_report(self, report: Report) -> Report:
        with self._lock:
            report.history.append((report.status, report.created_at))
            self.reports[report.id] = report
            return report

    def reports_at(self, site_id: str) -> list[Report]:
        with self._lock:
            found = [r for r in self.reports.values() if r.site_id == site_id]
        return sorted(found, key=lambda r: r.created_at, reverse=True)

    def reports_by_tokens(self, tokens: list[str]) -> list[Report]:
        wanted = set(tokens)
        with self._lock:
            found = [r for r in self.reports.values() if r.tracking_token in wanted]
        return sorted(found, key=lambda r: r.created_at, reverse=True)

    def update_report_status(self, report_id: str, status: str, at: datetime) -> Report:
        with self._lock:
            report = self.reports[report_id]
            report.status = status
            report.updated_at = at
            report.history.append((status, at))
            return report


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(6)}"


def new_tracking_token() -> str:
    return secrets.token_urlsafe(16)
