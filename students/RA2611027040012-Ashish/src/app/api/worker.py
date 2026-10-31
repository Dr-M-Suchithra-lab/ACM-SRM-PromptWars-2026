"""Worker interface API: shifts, pay, fatigue, language and SafeVoice reports."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field

from app import services
from app.api.deps import current_worker, get_now, get_settings, get_store
from app.config import Settings
from app.domain.i18n import LANGUAGES
from app.store.memory import MemoryStore, Report, Worker, new_id, new_tracking_token

router = APIRouter(prefix="/api/worker", tags=["worker"])

ALLOWED_AUDIO = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"}
MAX_REPORT_TEXT = 2000


class StartShift(BaseModel):
    code: str = Field(pattern=r"^\d{4}$")
    lat: float | None = Field(default=None, ge=-90, le=90)
    lon: float | None = Field(default=None, ge=-180, le=180)


class LanguageChoice(BaseModel):
    lang: str = Field(pattern="^(" + "|".join(LANGUAGES) + ")$")


@router.get("/me")
def profile(worker: Worker = Depends(current_worker), store: MemoryStore = Depends(get_store)):
    site = store.sites[worker.site_id]
    return {
        "name": worker.name,
        "lang": worker.lang,
        "team": store.teams[worker.team_id].name,
        "site": site.name,
        "sector": site.sector_id,
        "hourly_rate": worker.hourly_rate,
    }


@router.put("/lang")
def set_language(
    body: LanguageChoice,
    worker: Worker = Depends(current_worker),
    store: MemoryStore = Depends(get_store),
):
    store.set_language(worker.id, body.lang)
    return {"lang": body.lang}


@router.get("/status")
def status(
    worker: Worker = Depends(current_worker),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    return services.worker_status(store, worker, now)


@router.post("/shift/start")
def start_shift(
    body: StartShift,
    worker: Worker = Depends(current_worker),
    store: MemoryStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    now: datetime = Depends(get_now),
):
    services.start_shift_with_code(
        store, worker, body.code, settings.site_code_secret, now, body.lat, body.lon
    )
    return services.worker_status(store, worker, now)


@router.post("/shift/end")
def end_shift(
    worker: Worker = Depends(current_worker),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    services.end_shift(store, worker, now)
    return services.worker_status(store, worker, now)


@router.get("/payslip")
def payslip(
    week_of: date | None = Query(default=None),
    worker: Worker = Depends(current_worker),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    return services.worker_payslip(store, worker, week_of or now.date())


@router.post("/reports", status_code=201)
async def create_report(
    request: Request,
    text: str = Form(default="", max_length=MAX_REPORT_TEXT),
    anonymous: bool = Form(default=True),
    audio: UploadFile | None = File(default=None),
    worker: Worker = Depends(current_worker),
    store: MemoryStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    now: datetime = Depends(get_now),
):
    audio_bytes = None
    audio_mime = "audio/webm"
    if audio is not None and audio.filename:
        audio_mime = (audio.content_type or "").split(";")[0]
        if audio_mime not in ALLOWED_AUDIO:
            raise HTTPException(415, "Unsupported audio format.")
        audio_bytes = await audio.read(settings.max_audio_bytes + 1)
        if len(audio_bytes) > settings.max_audio_bytes:
            raise HTTPException(413, "Recording is too long. Please keep it under 1 minute.")
    if not text.strip() and not audio_bytes:
        raise HTTPException(422, "Please record or type your report.")

    sector = services.sector_for(store, worker.site_id)
    triage = request.app.state.triager.triage(
        sector.hazard_categories, text=text, audio=audio_bytes, audio_mime=audio_mime
    )
    report = store.add_report(
        Report(
            id=new_id("r"),
            site_id=worker.site_id,
            team_id=worker.team_id,
            worker_id=None if anonymous else worker.id,
            tracking_token=new_tracking_token(),
            source="voice" if audio_bytes else "text",
            original_lang=worker.lang,
            transcript=triage.transcript,
            summary=triage.summary,
            category=triage.category,
            severity=triage.severity,
            created_at=now,
        )
    )
    view = services.report_view(report, sector, now, manager=False)
    # The token is the only link between an anonymous report and its reporter, and it
    # lives on the worker's phone, not in our database's worker records.
    view["tracking_token"] = report.tracking_token
    view["ai_triaged"] = triage.ai
    return view


@router.get("/reports")
def track_reports(
    tokens: str = Query(default="", max_length=2000),
    worker: Worker = Depends(current_worker),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    wanted = [t for t in tokens.split(",") if t][:50]
    sector = services.sector_for(store, worker.site_id)
    return [
        services.report_view(r, sector, now, manager=False)
        for r in store.reports_by_tokens(wanted)
        if r.site_id == worker.site_id
    ]
