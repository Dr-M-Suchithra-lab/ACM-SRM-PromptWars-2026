"""Login for workers (phone + 4-digit PIN) and managers (email + password)."""

from __future__ import annotations

import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.api.deps import (
    Session,
    clear_session,
    get_session,
    get_settings,
    get_store,
    set_session,
)
from app.config import Settings
from app.security import verify_secret
from app.store.memory import MemoryStore
from app.store.seed import DEMO_MANAGERS, DEMO_WORKERS

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_FAILURES = 5
LOCKOUT_SECONDS = 300


class LoginThrottle:
    """Blocks an account for a few minutes after repeated wrong PINs/passwords."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._failures: dict[str, tuple[int, float]] = {}

    def check(self, key: str) -> None:
        with self._lock:
            count, since = self._failures.get(key, (0, 0.0))
            if count >= MAX_FAILURES and time.monotonic() - since < LOCKOUT_SECONDS:
                raise HTTPException(429, "Too many attempts. Please wait 5 minutes.")

    def fail(self, key: str) -> None:
        with self._lock:
            count, since = self._failures.get(key, (0, time.monotonic()))
            if time.monotonic() - since >= LOCKOUT_SECONDS:
                count, since = 0, time.monotonic()
            self._failures[key] = (count + 1, since)

    def succeed(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


throttle = LoginThrottle()


class WorkerLogin(BaseModel):
    phone: str = Field(pattern=r"^\d{10}$")
    pin: str = Field(pattern=r"^\d{4}$")


class ManagerLogin(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class DemoLogin(BaseModel):
    role: str = Field(pattern=r"^(worker|manager)$")
    sector: str = Field(pattern=r"^(construction|hospital)$")


@router.post("/worker")
def worker_login(
    body: WorkerLogin,
    response: Response,
    store: MemoryStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
) -> dict:
    key = f"worker:{body.phone}"
    throttle.check(key)
    worker = store.worker_by_phone(body.phone)
    if worker is None or not verify_secret(body.pin, worker.pin_hash):
        throttle.fail(key)
        raise HTTPException(401, "Phone number or PIN is not correct.")
    throttle.succeed(key)
    set_session(response, settings, Session("worker", worker.id))
    return {"role": "worker", "name": worker.name}


@router.post("/manager")
def manager_login(
    body: ManagerLogin,
    response: Response,
    store: MemoryStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
) -> dict:
    key = f"manager:{body.email.lower()}"
    throttle.check(key)
    manager = store.manager_by_email(body.email)
    if manager is None or not verify_secret(body.password, manager.password_hash):
        throttle.fail(key)
        raise HTTPException(401, "Email or password is not correct.")
    throttle.succeed(key)
    set_session(response, settings, Session("manager", manager.id))
    return {"role": "manager", "name": manager.name}


@router.post("/demo")
def demo_login(
    body: DemoLogin,
    response: Response,
    store: MemoryStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
) -> dict:
    """One-click login to the seeded demo accounts. Disabled when DEMO_MODE is off."""
    if not settings.demo_mode:
        raise HTTPException(404, "Not found")
    if body.role == "worker":
        user_id = DEMO_WORKERS[body.sector]
        name = store.workers[user_id].name
    else:
        user_id = DEMO_MANAGERS[body.sector]
        name = store.managers[user_id].name
    set_session(response, settings, Session(body.role, user_id))
    return {"role": body.role, "name": name}


@router.post("/logout")
def logout(response: Response) -> dict:
    clear_session(response)
    return {"ok": True}


@router.get("/me")
def me(
    session: Session | None = Depends(get_session),
    store: MemoryStore = Depends(get_store),
) -> dict:
    if session is None:
        return {"role": None}
    people = store.workers if session.role == "worker" else store.managers
    person = people.get(session.user_id)
    if person is None:
        return {"role": None}
    return {"role": session.role, "name": person.name}
