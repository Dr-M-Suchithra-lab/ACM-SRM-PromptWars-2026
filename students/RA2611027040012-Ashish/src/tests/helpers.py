from datetime import datetime, timedelta

from app.clock import IST
from app.domain.models import Shift


def at(day: int, hour: float, month: int = 6) -> datetime:
    """A 2026 timestamp in IST; 1 June 2026 is a Monday."""
    return datetime(2026, month, day, tzinfo=IST) + timedelta(hours=hour)


def shift(day: int, start_hour: float, hours: float, worker: str = "w1") -> Shift:
    start = at(day, start_hour)
    return Shift(worker_id=worker, start=start, end=start + timedelta(hours=hours))
