"""Demo data: one construction site and one hospital, three weeks of shift history.

History is generated relative to start-up time with a fixed random seed, so every demo
shows the same patterns: an overworked masonry crew, a healthy electrical crew, a small
team hidden for privacy, a night-nursing team, and a housekeeping team whose
attendance is dropping.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.domain.models import Shift
from app.security import hash_secret
from app.store.memory import Manager, MemoryStore, Report, Site, Team, Worker, new_tracking_token

DEMO_PIN = "1234"
DEMO_MANAGER_PASSWORD = "demo1234"  # noqa: S105 - published demo credential, not a secret

DEMO_WORKERS = {"construction": "w_ravi", "hospital": "w_lakshmi"}
DEMO_MANAGERS = {"construction": "m_construction", "hospital": "m_hospital"}


@dataclass(frozen=True)
class Profile:
    attendance: float
    start_hour: float
    length: float
    jitter: float
    late_attendance: float | None = None  # attendance during the most recent week


# Hand-aligned demo tables: one row per line reads better than one value per line.
# fmt: off
TEAMS = [
    # (team id, site id, name, profile, [(worker id, name, lang, hourly rate)])
    (
        "t_masonry", "s_skyline", "Masonry crew",
        Profile(0.95, 7, 11, 1.0),
        [
            ("w_ravi", "Ravi Kumar", "hi", 110), ("w_suresh", "Suresh Yadav", "hi", 105),
            ("w_murugan", "Murugan S", "ta", 110), ("w_anil", "Anil Paswan", "hi", 100),
            ("w_karthik", "Karthik R", "ta", 115), ("w_manoj", "Manoj Mahato", "hi", 100),
            ("w_selvam", "Selvam P", "ta", 105), ("w_deepak", "Deepak Singh", "hi", 110),
        ],
    ),
    (
        "t_electrical", "s_skyline", "Electrical crew",
        Profile(0.85, 9, 8.5, 0.5),
        [
            ("w_arjun", "Arjun Nair", "en", 140), ("w_imran", "Imran Shaikh", "hi", 135),
            ("w_prakash", "Prakash M", "ta", 130), ("w_vignesh", "Vignesh K", "ta", 140),
            ("w_rohit", "Rohit Das", "hi", 130), ("w_senthil", "Senthil Kumar", "ta", 135),
        ],
    ),
    (
        "t_scaffold", "s_skyline", "Scaffolding crew",
        Profile(0.85, 8, 9, 0.5),
        [
            ("w_bala", "Bala Murali", "ta", 120), ("w_ramesh", "Ramesh Oraon", "hi", 115),
            ("w_gopal", "Gopal Thakur", "hi", 115), ("w_jaya", "Jayakumar V", "ta", 120),
        ],
    ),
    (
        "t_nursing", "s_citygen", "Night nursing, Ward 3",
        Profile(0.8, 20, 13, 1.5),
        [
            ("w_lakshmi", "Lakshmi Devi", "ta", 160), ("w_priya", "Priya Raman", "ta", 155),
            ("w_anjali", "Anjali Thomas", "en", 160), ("w_meena", "Meena Kumari", "hi", 150),
            ("w_divya", "Divya S", "ta", 155), ("w_fatima", "Fatima Begum", "hi", 150),
            ("w_kavitha", "Kavitha N", "ta", 160),
        ],
    ),
    (
        "t_housekeeping", "s_citygen", "Sanitation & housekeeping",
        Profile(0.92, 6, 8, 0.5, late_attendance=0.6),
        [
            ("w_saroja", "Saroja M", "ta", 95), ("w_ramu", "Ramu K", "ta", 95),
            ("w_geetha", "Geetha P", "ta", 95), ("w_babu", "Babu Rao", "en", 95),
            ("w_sunita", "Sunita Devi", "hi", 95), ("w_mani", "Mani Vel", "ta", 95),
            ("w_parvathi", "Parvathi S", "ta", 95), ("w_raju", "Raju Naik", "hi", 95),
        ],
    ),
]

REPORTS = [
    # (site, team, anonymous worker?, lang, transcript, summary, category, severity, hours ago,
    #  status)
    (
        "s_skyline", "t_masonry", None, "hi",
        "तीसरी मंज़िल पर मचान की रेलिंग टूटी हुई है, कोई भी गिर सकता है।",
        "Broken scaffolding guard-rail on the 3rd floor; workers could fall.",
        "fall", "critical", 5, "reported",
    ),
    (
        "s_skyline", "t_electrical", "w_prakash", "ta",
        "பேஸ்மென்ட்டில் மின் கம்பிகள் தண்ணீரில் கிடக்கின்றன.",
        "Live electrical cables lying in standing water in the basement.",
        "electrical", "high", 20, "seen",
    ),
    (
        "s_skyline", "t_masonry", None, "hi",
        "पिछले दो हफ़्ते का ओवरटाइम अभी तक नहीं मिला।",
        "Overtime for the last two weeks has not been paid.",
        "wages", "medium", 50, "reported",
    ),
    (
        "s_skyline", "t_scaffold", "w_bala", "en",
        "No drinking water near the east block during the afternoon heat.",
        "No drinking water near the east block during afternoon heat.",
        "heat", "high", 30, "fixed",
    ),
    (
        "s_citygen", "t_nursing", None, "ta",
        "வார்டு 3-ல் இரவு ஷிப்ட்டில் ஊசி அப்புறப்படுத்தும் பெட்டி நிரம்பி வழிகிறது.",
        "Sharps disposal box overflowing in Ward 3 during the night shift.",
        "infection", "high", 10, "reported",
    ),
    (
        "s_citygen", "t_housekeeping", "w_sunita", "hi",
        "केमिकल स्टोर में दस्ताने खत्म हो गए हैं।",
        "Chemical store has run out of protective gloves.",
        "chemical", "medium", 26, "seen",
    ),
    (
        "s_citygen", "t_nursing", None, "en",
        "The supervisor shouts at staff during handover.",
        "Supervisor shouts at staff during shift handover.",
        "harassment", "medium", 80, "reported",
    ),
]
# fmt: on


def seed(store: MemoryStore, now: datetime) -> None:
    store.add_site(
        Site("s_skyline", "Skyline Residency, Tower B", "construction", "Chennai", 12.9716, 80.2209)
    )
    store.add_site(
        Site("s_citygen", "City General Hospital", "hospital", "Chennai", 13.0827, 80.2707)
    )

    pin_hash = hash_secret(DEMO_PIN)
    password_hash = hash_secret(DEMO_MANAGER_PASSWORD)
    store.add_manager(
        Manager(
            "m_construction",
            "Anand Krishnan",
            "site.manager@fairshift.demo",
            password_hash,
            "s_skyline",
        )
    )
    store.add_manager(
        Manager(
            "m_hospital",
            "Dr. Rekha Iyer",
            "hospital.manager@fairshift.demo",
            password_hash,
            "s_citygen",
        )
    )

    rng = random.Random(42)
    phone = 9_000_000_000
    for team_id, site_id, team_name, profile, members in TEAMS:
        store.add_team(Team(team_id, site_id, team_name))
        for worker_id, name, lang, rate in members:
            phone += 1
            store.add_worker(
                Worker(worker_id, name, str(phone), pin_hash, site_id, team_id, rate, lang)
            )
            demo = worker_id in DEMO_WORKERS.values()
            store.add_history(_history(worker_id, profile, now, rng, demo))

    for i, row in enumerate(REPORTS):
        site, team, worker, lang, transcript, summary, category, severity, ago, status = row
        created = now - timedelta(hours=ago)
        report = store.add_report(
            Report(
                id=f"r_seed{i}",
                site_id=site,
                team_id=team,
                worker_id=worker,
                tracking_token=new_tracking_token(),
                source="voice" if i % 2 == 0 else "text",
                original_lang=lang,
                transcript=transcript,
                summary=summary,
                category=category,
                severity=severity,
                created_at=created,
            )
        )
        if status != "reported":
            store.update_report_status(report.id, status, created + timedelta(hours=ago / 3))


def _history(
    worker_id: str, profile: Profile, now: datetime, rng: random.Random, demo: bool
) -> list[Shift]:
    """Shifts for the last 21 days. Demo workers rested a week ago, then worked the last
    6 days straight with no shift yet today, so the demo opens with a visible fatigue
    warning and a clean 'Start shift' button (starting makes it day 7 in a row)."""
    shifts: list[Shift] = []
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for days_ago in range(21, -1, -1):
        if demo and days_ago in (0, 7):
            continue
        attendance = profile.attendance
        if profile.late_attendance is not None and days_ago < 7:
            attendance = profile.late_attendance
        must_work = demo and days_ago <= 6
        if not must_work and rng.random() > attendance:
            continue
        start = (
            today
            - timedelta(days=days_ago)
            + timedelta(hours=profile.start_hour + rng.uniform(-0.25, 0.25))
        )
        if start >= now:
            continue
        end = start + timedelta(hours=profile.length + rng.uniform(-profile.jitter, profile.jitter))
        method = "rollcall" if rng.random() < 0.15 else "code"
        if end > now:
            shifts.append(Shift(worker_id, start, None, method, rng.random() < 0.7))
        else:
            shifts.append(Shift(worker_id, start, end, method, rng.random() < 0.7))
    return shifts
