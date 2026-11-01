"""Industry rule sets.

Each sector is a JSON file in this package. Adding an industry means adding a file;
no code changes are needed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import cache
from pathlib import Path

_DIR = Path(__file__).parent


@dataclass(frozen=True)
class SectorConfig:
    id: str
    name: str
    currency: str
    daily_regular_hours: float
    weekly_regular_hours: float
    overtime_multiplier: float
    night_window: tuple[int, int]
    night_allowance_per_hour: float
    max_daily_hours: float
    min_rest_hours: float
    max_consecutive_days: int
    weekly_hours_cap: float
    hazard_categories: tuple[str, ...]
    sla_hours: dict[str, float]

    @classmethod
    def from_dict(cls, data: dict) -> SectorConfig:
        return cls(
            **{
                **data,
                "night_window": tuple(data["night_window"]),
                "hazard_categories": tuple(data["hazard_categories"]),
            }
        )


@cache
def all_sectors() -> dict[str, SectorConfig]:
    sectors = {}
    for path in sorted(_DIR.glob("*.json")):
        config = SectorConfig.from_dict(json.loads(path.read_text(encoding="utf-8")))
        sectors[config.id] = config
    return sectors


def get_sector(sector_id: str) -> SectorConfig:
    try:
        return all_sectors()[sector_id]
    except KeyError:
        raise ValueError(f"Unknown sector: {sector_id}") from None
