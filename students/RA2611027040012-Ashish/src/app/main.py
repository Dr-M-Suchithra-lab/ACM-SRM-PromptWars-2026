"""FairShift application entry point."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app import clock
from app.ai.triage import Triager
from app.api import admin, auth, worker
from app.config import Settings
from app.services import ServiceError
from app.store.memory import MemoryStore
from app.store.seed import seed

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
log = logging.getLogger(__name__)

SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; "
        "style-src 'self'; script-src 'self'; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "microphone=(self), geolocation=(self), camera=()",
}


def create_app(
    settings: Settings | None = None,
    now: Callable[[], datetime] = clock.now,
) -> FastAPI:
    settings = settings or Settings.from_env()
    logging.basicConfig(level=logging.INFO)

    app = FastAPI(title="FairShift", version="1.0.0", docs_url="/api/docs", redoc_url=None)
    app.state.settings = settings
    app.state.clock = now
    app.state.store = MemoryStore()
    app.state.triager = Triager(settings)
    seed(app.state.store, now())

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(ServiceError)
    async def service_error(_: Request, exc: ServiceError):
        return JSONResponse(
            status_code=exc.status, content={"detail": exc.message, "code": exc.code}
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, _: Exception):
        # Log the full trace server-side; never show a stack trace to the user.
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong on our side. Please try again."},
        )

    @app.get("/api/health", tags=["meta"])
    def health() -> dict:
        return {"status": "ok", "ai": app.state.triager.ai_available}

    app.include_router(auth.router)
    app.include_router(worker.router)
    app.include_router(admin.router)

    for page in ("worker", "admin"):
        app.add_api_route(f"/{page}", _page(f"{page}.html"), include_in_schema=False)
    app.add_api_route("/sw.js", _page("sw.js"), include_in_schema=False)
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
    return app


def _page(name: str):
    path = STATIC_DIR / name

    def serve() -> FileResponse:
        return FileResponse(path)

    return serve


app = create_app()
