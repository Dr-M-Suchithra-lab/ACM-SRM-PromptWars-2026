"""Spoken-style sentences for workers in English, Hindi and Tamil.

These sentences are shown on screen and read aloud by the phone, so they are short and
use plain words.
"""

from __future__ import annotations

from app.domain.fatigue import CONSECUTIVE_DAYS, LONG_DAY, SHORT_REST, WEEKLY_CAP, FatigueAlert
from app.domain.pay import Payslip

LANGUAGES = ("en", "hi", "ta")
DEFAULT_LANGUAGE = "en"

# fmt: off
_PAYSLIP = {
    "en": (
        "This week you worked {hours} hours. {overtime} of these hours were overtime. "
        "Your total earnings are {total} rupees."
    ),
    "hi": (
        "इस हफ़्ते आपने {hours} घंटे काम किया। इनमें से {overtime} घंटे ओवरटाइम थे। "
        "आपकी कुल कमाई {total} रुपये है।"
    ),
    "ta": (
        "இந்த வாரம் நீங்கள் {hours} மணி நேரம் வேலை செய்தீர்கள். "
        "அதில் {overtime} மணி நேரம் கூடுதல் நேரம். உங்கள் மொத்த வருமானம் {total} ரூபாய்."
    ),
}

_ALERTS = {
    LONG_DAY: {
        "en": "You have worked {hours} hours in the last day. Please rest before your next shift.",
        "hi": "पिछले एक दिन में आपने {hours} घंटे काम किया है। अगली शिफ्ट से पहले आराम करें।",
        "ta": "கடந்த ஒரு நாளில் நீங்கள் {hours} மணி நேரம் வேலை செய்துள்ளீர்கள். "
        "அடுத்த ஷிப்ட்டுக்கு முன் ஓய்வு எடுங்கள்.",
    },
    SHORT_REST: {
        "en": "You rested only {hours} hours between shifts. You need at least {min} hours.",
        "hi": "शिफ्टों के बीच आपको सिर्फ़ {hours} घंटे आराम मिला। कम से कम {min} घंटे ज़रूरी हैं।",
        "ta": "ஷிப்ட்களுக்கு இடையே {hours} மணி நேரம் மட்டுமே ஓய்வு கிடைத்தது. "
        "குறைந்தது {min} மணி நேரம் தேவை.",
    },
    CONSECUTIVE_DAYS: {
        "en": "You have worked {days} days in a row. You should take a day off.",
        "hi": "आपने लगातार {days} दिन काम किया है। एक दिन की छुट्टी लें।",
        "ta": "நீங்கள் தொடர்ந்து {days} நாட்கள் வேலை செய்துள்ளீர்கள். ஒரு நாள் விடுப்பு எடுங்கள்.",
    },
    WEEKLY_CAP: {
        "en": "In the last 7 days you worked {hours} hours. The safe limit is {cap} hours.",
        "hi": "पिछले 7 दिनों में आपने {hours} घंटे काम किया। सुरक्षित सीमा {cap} घंटे है।",
        "ta": "கடந்த 7 நாட்களில் நீங்கள் {hours} மணி நேரம் வேலை செய்தீர்கள். "
        "பாதுகாப்பான வரம்பு {cap} மணி நேரம்.",
    },
}
# fmt: on


def normalize_language(lang: str | None) -> str:
    return lang if lang in LANGUAGES else DEFAULT_LANGUAGE


def payslip_sentence(payslip: Payslip, lang: str) -> str:
    return _PAYSLIP[normalize_language(lang)].format(
        hours=_num(payslip.hours_worked),
        overtime=_num(payslip.overtime_hours),
        total=f"{round(payslip.gross):,}",
    )


def alert_message(alert: FatigueAlert, lang: str) -> str:
    params = {k: _num(v) if isinstance(v, float) else v for k, v in alert.params.items()}
    return _ALERTS[alert.code][normalize_language(lang)].format(**params)


def _num(value: float) -> str:
    """12.0 -> '12', 12.25 -> '12.3' (one decimal is easier to listen to)."""
    rounded = round(value, 1)
    return str(int(rounded)) if rounded == int(rounded) else str(rounded)
