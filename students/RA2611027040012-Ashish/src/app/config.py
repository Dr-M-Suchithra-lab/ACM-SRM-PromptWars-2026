"""Runtime settings, read from environment variables. No secrets live in code."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def load_env_file(path: Path = ENV_FILE) -> None:
    """Load KEY=VALUE lines from a local, git-ignored .env file for development.
    Real environment variables always win."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip("\"'")
        # A blank value (as copied from .env.example) means "unset": keep the default.
        if value:
            os.environ.setdefault(key.strip(), value)


def _flag(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    session_secret: str
    site_code_secret: str
    demo_mode: bool
    secure_cookies: bool
    ai_enabled: bool
    gcp_project: str | None
    gcp_location: str
    gemini_model: str
    max_audio_bytes: int
    gemini_api_key: str | None = None

    @classmethod
    def from_env(cls) -> Settings:
        load_env_file()
        project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        api_key = os.environ.get("GEMINI_API_KEY") or None
        return cls(
            # Random per-process fallbacks keep local dev working without leaking a fixed key.
            session_secret=os.environ.get("SESSION_SECRET") or secrets.token_urlsafe(32),
            site_code_secret=os.environ.get("SITE_CODE_SECRET") or secrets.token_urlsafe(32),
            demo_mode=_flag("DEMO_MODE", True),
            secure_cookies=_flag("SECURE_COOKIES", False),
            ai_enabled=_flag("AI_ENABLED", bool(project or api_key)),
            gcp_project=project,
            gcp_location=os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-south1"),
            gemini_model=os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite"),
            max_audio_bytes=int(os.environ.get("MAX_AUDIO_BYTES", str(2 * 1024 * 1024))),
            gemini_api_key=api_key,
        )
