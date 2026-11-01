"""Manager interface API. Every route is scoped to the manager's own site."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app import services
from app.api.deps import current_manager, get_now, get_settings, get_store
from app.config import Settings
from app.domain import sitecode
from app.domain.escalation import STATUSES
from app.store.memory import Manager, MemoryStore

router = APIRouter(prefix="/api/admin", tags=["admin"])


class RollCall(BaseModel):
    worker_ids: list[Annotated[str, Field(min_length=1, max_length=64)]] = Field(
        min_length=1, max_length=200
    )


class StatusChange(BaseModel):
    status: str = Field(pattern="^(" + "|".join(STATUSES) + ")$")


@router.get("/dashboard")
def dashboard(
    manager: Manager = Depends(current_manager),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    data = services.dashboard(store, manager.site_id, now)
    data["manager"] = manager.name
    return data


@router.get("/site-code")
def site_code(
    manager: Manager = Depends(current_manager),
    settings: Settings = Depends(get_settings),
    now: datetime = Depends(get_now),
):
    return {
        "code": sitecode.code_for(settings.site_code_secret, manager.site_id, now),
        "seconds_left": sitecode.seconds_remaining(now),
        "window_seconds": sitecode.WINDOW_SECONDS,
    }


@router.get("/roster")
def roster(manager: Manager = Depends(current_manager), store: MemoryStore = Depends(get_store)):
    return services.roster(store, manager.site_id)


@router.post("/rollcall")
def roll_call(
    body: RollCall,
    manager: Manager = Depends(current_manager),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    started = services.roll_call(store, manager.site_id, body.worker_ids, now)
    return {"started": started}


@router.get("/reports")
def reports(
    manager: Manager = Depends(current_manager),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    sector = services.sector_for(store, manager.site_id)
    return [
        services.report_view(r, sector, now, manager=True)
        for r in store.reports_at(manager.site_id)
    ]


@router.patch("/reports/{report_id}")
def update_report(
    report_id: str,
    body: StatusChange,
    manager: Manager = Depends(current_manager),
    store: MemoryStore = Depends(get_store),
    now: datetime = Depends(get_now),
):
    report = services.change_report_status(store, manager.site_id, report_id, body.status, now)
    sector = services.sector_for(store, manager.site_id)
    return services.report_view(report, sector, now, manager=True)
