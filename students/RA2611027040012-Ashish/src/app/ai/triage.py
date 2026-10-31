"""SafeVoice triage: turn a worker's voice or text report into a structured issue.

With Gemini enabled, the model transcribes speech in any Indian language, translates it
to English for the manager, and assigns a category and severity. On Cloud Run it uses
Vertex AI with the service identity (no key); elsewhere it uses GEMINI_API_KEY from the
environment. The key is never stored in code.

Without AI (local development, tests, or an outage), a keyword classifier in English,
Hindi and Tamil keeps the feature working for typed reports.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from app.config import Settings
from app.domain.escalation import SEVERITIES

log = logging.getLogger(__name__)

AI_TIMEOUT_MS = 15_000


@dataclass(frozen=True)
class Triage:
    transcript: str
    summary: str
    category: str
    severity: str
    ai: bool


# fmt: off
_SEVERITY_WORDS = {
    "critical": [
        "fire", "collapse", "shock", "electrocut", "bleeding", "unconscious", "fall", "falling",
        "आग", "करंट", "गिर", "खून", "बेहोश",
        "தீ", "மின்சாரம் தாக்", "ஷாக்", "விழ", "இரத்த", "மயக்க",
    ],
    "high": [
        "broken", "injur", "gas", "leak", "wire", "cable", "chemical", "needle", "sharps",
        "heat", "harass", "unsafe",
        "टूट", "चोट", "गैस", "तार", "केमिकल", "सुई", "गर्मी", "परेशान",
        "உடைந்", "காயம்", "கம்பி", "வாயு", "ஊசி", "வெப்ப", "தொந்தரவு",
    ],
}

_CATEGORY_WORDS = {
    "fall": ["fall", "scaffold", "ladder", "height", "railing", "गिर", "मचान", "சாரம்", "விழ"],
    "electrical": ["wire", "cable", "shock", "electric", "current", "तार", "करंट", "மின்"],
    "heat": ["heat", "water", "sun", "गर्मी", "पानी", "வெப்ப", "தண்ணீர்"],
    "infection": ["needle", "sharps", "blood", "infection", "सुई", "संक्रमण", "ஊசி", "தொற்று"],
    "chemical": ["chemical", "acid", "glove", "केमिकल", "दस्ताने", "இரசாயன", "கையுறை"],
    "slip": ["slip", "wet floor", "फिसल", "வழுக்"],
    "equipment": ["machine", "equipment", "tool", "मशीन", "औज़ार", "இயந்திர"],
    "harassment": ["harass", "shout", "abuse", "touch", "परेशान", "गाली", "தொந்தரவு", "திட்ட"],
    "wages": ["salary", "wage", "pay", "overtime", "वेतन", "पैसा", "ओवरटाइम", "சம்பள"],
}
# fmt: on


def keyword_triage(text: str, categories: tuple[str, ...]) -> Triage:
    lowered = text.lower()
    severity = "medium"
    for level in ("critical", "high"):
        if any(word in lowered for word in _SEVERITY_WORDS[level]):
            severity = level
            break
    category = next(
        (
            cat
            for cat in categories
            if any(word in lowered for word in _CATEGORY_WORDS.get(cat, []))
        ),
        "other",
    )
    clean = " ".join(text.split())
    summary = clean if len(clean) <= 160 else clean[:157] + "..."
    return Triage(transcript=clean, summary=summary, category=category, severity=severity, ai=False)


_PROMPT = """You triage workplace safety and welfare reports from shift workers in India.
The report may be in Hindi, Tamil, English or another Indian language, spoken or typed.
Return JSON with:
- "transcript": the report in its original language (transcribe audio if present)
- "summary": one clear English sentence for the manager, max 25 words, no names
- "category": one of {categories}
- "severity": one of {severities}. critical = immediate risk to life or limb;
  high = likely injury or serious welfare breach; medium = needs action this week; low = minor.
Remove any personal names from the summary to protect the reporter."""


class Triager:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = None
        if settings.ai_enabled and (settings.gcp_project or settings.gemini_api_key):
            try:
                from google import genai
                from google.genai import types

                # A worker is waiting on this request: fail fast and fall back to keywords.
                http = types.HttpOptions(timeout=AI_TIMEOUT_MS)
                if settings.gcp_project:
                    # Preferred on Cloud Run: Vertex AI with the service identity, no key.
                    self._client = genai.Client(
                        vertexai=True,
                        project=settings.gcp_project,
                        location=settings.gcp_location,
                        http_options=http,
                    )
                else:
                    # Hosts outside Google Cloud (Render, local): AI Studio key from env.
                    self._client = genai.Client(api_key=settings.gemini_api_key, http_options=http)
            except Exception:  # noqa: BLE001 - AI is optional; fall back to keywords
                log.exception("Gemini client unavailable; using keyword triage")

    @property
    def ai_available(self) -> bool:
        return self._client is not None

    def triage(
        self,
        categories: tuple[str, ...],
        text: str = "",
        audio: bytes | None = None,
        audio_mime: str = "audio/webm",
    ) -> Triage:
        if self._client is not None:
            try:
                return self._gemini(categories, text, audio, audio_mime)
            except Exception:  # noqa: BLE001 - never lose a safety report to an AI error
                log.exception("Gemini triage failed; using keyword triage")
        if text.strip():
            return keyword_triage(text, categories)
        return Triage(
            transcript="",
            summary="Voice report received. Please listen to the worker or ask for details.",
            category="other",
            severity="high",
            ai=False,
        )

    def _gemini(
        self, categories: tuple[str, ...], text: str, audio: bytes | None, audio_mime: str
    ) -> Triage:
        from google.genai import types

        parts: list = [
            _PROMPT.format(categories=", ".join(categories), severities=", ".join(SEVERITIES))
        ]
        if text.strip():
            parts.append(f"Typed report: {text.strip()}")
        if audio:
            parts.append(types.Part.from_bytes(data=audio, mime_type=audio_mime))

        response = self._client.models.generate_content(
            model=self._settings.gemini_model,
            contents=parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=1024,
            ),
        )
        data = json.loads(response.text)
        category = data.get("category") if data.get("category") in categories else "other"
        severity = data.get("severity") if data.get("severity") in SEVERITIES else "high"
        return Triage(
            transcript=str(data.get("transcript") or text)[:2000],
            summary=str(data.get("summary") or "Report received")[:300],
            category=category,
            severity=severity,
            ai=True,
        )
