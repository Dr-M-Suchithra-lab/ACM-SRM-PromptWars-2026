from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Shift:
    worker_id: str
    start: datetime
    end: datetime | None = None
    method: str = "code"  # "code" (site code) or "rollcall" (marked by supervisor)
    location_verified: bool = False

    def hours(self, until: datetime | None = None) -> float:
        """Length in hours; an open shift is measured up to `until`."""
        end = self.end or until
        if end is None or end <= self.start:
            return 0.0
        return (end - self.start).total_seconds() / 3600
