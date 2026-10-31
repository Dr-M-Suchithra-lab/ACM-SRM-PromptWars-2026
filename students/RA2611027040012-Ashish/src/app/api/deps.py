"""Shared request dependencies: clock, store, and signed-cookie sessions."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from fastapi import Depends, HTTPException, Request, Response
from itsdangerous import BadSignature, URLSafeTimedSerializer

from app.config import Settings
from app.store.memory import Manager, MemoryStore, Worker

COOKIE = "fs_session"
SESSION_MAX_AGE = 12 * 3600


@dataclass(frozen=True)
class Session:
    role: str  # "worker" | "manager"
    user_id: str


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_store(request: Request) -> MemoryStore:
    return request.app.state.store


def get_now(request: Request) -> datetime:
    return request.app.state.clock()


def _serializer(settings: Settings) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.session_secret, salt="fairshift-session")


def set_session(response: Response, settings: Settings, session: Session) -> None:
    token = _serializer(settings).dumps({"role": session.role, "id": session.user_id})
    response.set_cookie(
        COOKIE,
        token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="strict",
        secure=settings.secure_cookies,
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE)


def get_session(request: Request, settings: Settings = Depends(get_settings)) -> Session | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    try:
        data = _serializer(settings).loads(token, max_age=SESSION_MAX_AGE)
    except BadSignature:
        return None
    return Session(role=data["role"], user_id=data["id"])


def current_worker(
    session: Session | None = Depends(get_session),
    store: MemoryStore = Depends(get_store),
) -> Worker:
    if session is None or session.role != "worker" or session.user_id not in store.workers:
        raise HTTPException(status_code=401, detail="Please log in as a worker.")
    return store.workers[session.user_id]


def current_manager(
    session: Session | None = Depends(get_session),
    store: MemoryStore = Depends(get_store),
) -> Manager:
    if session is None or session.role != "manager" or session.user_id not in store.managers:
        raise HTTPException(status_code=401, detail="Please log in as a manager.")
    return store.managers[session.user_id]
