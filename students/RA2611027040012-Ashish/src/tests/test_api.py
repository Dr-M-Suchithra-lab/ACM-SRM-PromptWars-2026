from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app import services
from app.api import auth
from app.config import Settings
from app.domain import sitecode
from app.main import create_app
from tests.helpers import at

SECRET = "test-site-secret"


class Clock:
    def __init__(self, start):
        self.value = start

    def __call__(self):
        return self.value


def make_settings(**overrides):
    base = dict(
        session_secret="test-session-secret",
        site_code_secret=SECRET,
        demo_mode=True,
        secure_cookies=False,
        ai_enabled=False,
        gcp_project=None,
        gcp_location="asia-south1",
        gemini_model="test",
        max_audio_bytes=1024,
    )
    return Settings(**{**base, **overrides})


@pytest.fixture
def clock():
    return Clock(at(10, 9.5))  # Wednesday 10 June 2026, 09:30 IST


@pytest.fixture
def client(clock):
    auth.throttle = auth.LoginThrottle()
    return TestClient(create_app(make_settings(), now=clock))


def login(client, role="worker", sector="construction"):
    r = client.post("/api/auth/demo", json={"role": role, "sector": sector})
    assert r.status_code == 200
    return r


# --- meta & security ------------------------------------------------------------------


def test_health_endpoint(client):
    assert client.get("/api/health").json() == {"status": "ok", "ai": False}


def test_security_headers_present(client):
    headers = client.get("/").headers
    assert "default-src 'self'" in headers["content-security-policy"]
    assert headers["x-frame-options"] == "DENY"


def test_unexpected_error_returns_friendly_json(clock, monkeypatch):
    def boom(*_args):
        raise RuntimeError("internal detail")

    monkeypatch.setattr(services, "worker_status", boom)
    client = TestClient(create_app(make_settings(), now=clock), raise_server_exceptions=False)
    login(client)
    r = client.get("/api/worker/status")
    assert r.status_code == 500
    assert "internal detail" not in r.text
    assert r.json()["detail"].startswith("Something went wrong")


def test_pages_are_served(client):
    for path in ("/", "/worker", "/admin"):
        assert client.get(path).status_code == 200


def test_worker_routes_need_login(client):
    assert client.get("/api/worker/status").status_code == 401


def test_worker_cannot_use_manager_routes(client):
    login(client, "worker")
    assert client.get("/api/admin/dashboard").status_code == 401


def test_tampered_cookie_is_rejected(client):
    client.cookies.set("fs_session", "forged.value.here")
    assert client.get("/api/worker/status").status_code == 401


def test_demo_login_can_be_disabled(clock):
    app = create_app(make_settings(demo_mode=False), now=clock)
    r = TestClient(app).post("/api/auth/demo", json={"role": "worker", "sector": "hospital"})
    assert r.status_code == 404


# --- login ----------------------------------------------------------------------------


def test_worker_pin_login(client):
    r = client.post("/api/auth/worker", json={"phone": "9000000001", "pin": "1234"})
    assert r.status_code == 200
    assert client.get("/api/auth/me").json()["role"] == "worker"


def test_wrong_pin_is_rejected_then_locked(client):
    for _ in range(auth.MAX_FAILURES):
        r = client.post("/api/auth/worker", json={"phone": "9000000001", "pin": "0000"})
        assert r.status_code == 401
    r = client.post("/api/auth/worker", json={"phone": "9000000001", "pin": "1234"})
    assert r.status_code == 429


def test_manager_password_login(client):
    r = client.post(
        "/api/auth/manager",
        json={"email": "site.manager@fairshift.demo", "password": "demo1234"},
    )
    assert r.status_code == 200


def test_invalid_login_payload_is_rejected(client):
    assert client.post("/api/auth/worker", json={"phone": "12", "pin": "x"}).status_code == 422


# --- worker flow ----------------------------------------------------------------------


def test_demo_worker_starts_with_fatigue_warning(client):
    login(client)
    status = client.get("/api/worker/status").json()
    assert status["on_shift"] is False
    assert status["days_in_a_row"] == 6
    assert any(a["code"] == "weekly_cap" for a in status["alerts"])


def test_shift_check_in_and_out_with_site_code(client, clock):
    login(client)
    code = sitecode.code_for(SECRET, "s_skyline", clock.value)

    r = client.post("/api/worker/shift/start", json={"code": code})
    assert r.status_code == 200 and r.json()["on_shift"] is True

    clock.value += timedelta(hours=8)
    r = client.post("/api/worker/shift/end")
    assert r.status_code == 200
    assert r.json()["on_shift"] is False
    assert r.json()["hours_today"] == pytest.approx(8, abs=0.01)


def test_wrong_site_code_is_rejected(client, clock):
    login(client)
    right = sitecode.code_for(SECRET, "s_skyline", clock.value)
    wrong = f"{(int(right) + 1) % 10000:04d}"
    r = client.post("/api/worker/shift/start", json={"code": wrong})
    assert r.status_code == 400
    assert r.json()["code"] == "bad_code"


def test_cannot_end_shift_that_was_not_started(client):
    login(client)
    assert client.post("/api/worker/shift/end").json()["code"] == "no_shift"


def test_payslip_is_localised(client):
    login(client)
    assert client.put("/api/worker/lang", json={"lang": "ta"}).status_code == 200
    slip = client.get("/api/worker/payslip").json()
    assert "மணி நேரம்" in slip["sentence"]
    assert slip["gross"] == sum(line["amount"] for line in slip["lines"])


def test_unsupported_language_is_rejected(client):
    login(client)
    assert client.put("/api/worker/lang", json={"lang": "fr"}).status_code == 422


# --- SafeVoice --------------------------------------------------------------------------


def test_anonymous_report_hides_identity_and_can_be_tracked(client):
    login(client)
    r = client.post(
        "/api/worker/reports",
        data={"text": "Electric wire hanging near the lift, I got a shock", "anonymous": "true"},
    )
    assert r.status_code == 201
    created = r.json()
    assert created["severity"] == "critical"
    assert created["category"] == "electrical"

    tracked = client.get("/api/worker/reports", params={"tokens": created["tracking_token"]})
    assert [t["id"] for t in tracked.json()] == [created["id"]]

    login(client, "manager")
    reports = client.get("/api/admin/reports").json()
    mine = next(rep for rep in reports if rep["id"] == created["id"])
    assert mine["anonymous"] is True
    assert "worker_id" not in mine


def test_empty_report_is_rejected(client):
    login(client)
    assert client.post("/api/worker/reports", data={"text": "  "}).status_code == 422


def test_oversized_audio_is_rejected(client):
    login(client)
    files = {"audio": ("note.webm", b"x" * 2048, "audio/webm")}
    assert client.post("/api/worker/reports", files=files).status_code == 413


def test_voice_report_without_ai_is_kept(client):
    login(client)
    files = {"audio": ("note.webm", b"x" * 100, "audio/webm")}
    r = client.post("/api/worker/reports", files=files)
    assert r.status_code == 201
    assert r.json()["severity"] == "high"


# --- manager flow ---------------------------------------------------------------------


def test_dashboard_shows_team_health_and_privacy_gate(client):
    login(client, "manager")
    data = client.get("/api/admin/dashboard").json()
    assert data["sector"]["id"] == "construction"
    teams = {t["name"]: t for t in data["teams"]}
    assert teams["Scaffolding crew"]["health"]["hidden"] is True
    assert teams["Masonry crew"]["health"]["score"] < teams["Electrical crew"]["health"]["score"]
    assert data["kpis"]["escalated_reports"] >= 1
    assert len(data["attendance_trend"]) == 14


def test_hospital_manager_sees_hospital_only(client):
    login(client, "manager", "hospital")
    data = client.get("/api/admin/dashboard").json()
    assert data["sector"]["id"] == "hospital"
    reports = client.get("/api/admin/reports").json()
    assert reports and all(r["category"] != "fall" for r in reports)


def test_site_code_matches_worker_check_in(client):
    login(client, "manager")
    code = client.get("/api/admin/site-code").json()["code"]
    login(client, "worker")
    assert client.post("/api/worker/shift/start", json={"code": code}).status_code == 200


def test_roll_call_starts_shifts(client):
    login(client, "manager")
    roster = client.get("/api/admin/roster").json()
    absent = [w["id"] for w in roster if not w["on_shift"]]
    assert "w_ravi" in absent
    r = client.post("/api/admin/rollcall", json={"worker_ids": absent + ["w_lakshmi"]})
    assert r.json()["started"] == len(absent)  # the hospital worker is ignored
    assert all(w["on_shift"] for w in client.get("/api/admin/roster").json())


def test_report_status_flow(client):
    login(client, "manager")
    report = next(r for r in client.get("/api/admin/reports").json() if r["status"] == "reported")
    url = f"/api/admin/reports/{report['id']}"
    assert client.patch(url, json={"status": "seen"}).json()["status"] == "seen"
    r = client.patch(url, json={"status": "reported"})
    assert r.status_code == 400


def test_manager_cannot_touch_other_site_reports(client):
    login(client, "manager", "hospital")
    r = client.patch("/api/admin/reports/r_seed0", json={"status": "seen"})  # construction
    assert r.status_code == 404
