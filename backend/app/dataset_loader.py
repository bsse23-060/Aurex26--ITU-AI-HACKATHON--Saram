from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from .models import OnboardingRequest


ROOT = Path(__file__).resolve().parents[2]


def _split_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not value:
        return []
    return [item.strip() for item in str(value).split("|") if item.strip()]


def _to_profile(row: dict[str, Any]) -> OnboardingRequest:
    return OnboardingRequest(
        name=str(row.get("name", "Learner")),
        goal=str(row.get("goal", "Build job-ready AI skills")),
        background=str(row.get("background", "Not specified")),
        weekly_hours=int(row.get("weekly_hours", 6)),
        language=row.get("language", "Mixed"),
        confidence=int(row.get("confidence", 3)),
        baseline_quiz=int(row.get("baseline_quiz", row.get("quiz_score", 55))),
        attendance_rate=int(row.get("attendance_rate", 85)),
        activity_rate=int(row.get("activity_rate", 70)),
        motivation_style=str(row.get("motivation_style", "career progress")),
        barriers=_split_list(row.get("barriers", "")),
        weak_skills=_split_list(row.get("weak_skills", "")),
    )


def load_external_profiles() -> list[OnboardingRequest]:
    """Load organizer-provided learner data when placed in data/organizer_learners.csv or .json."""
    data_dir = ROOT / "data"
    csv_path = data_dir / "organizer_learners.csv"
    json_path = data_dir / "organizer_learners.json"

    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            return [_to_profile(row) for row in csv.DictReader(handle)]

    if json_path.exists():
        with json_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        rows = data if isinstance(data, list) else data.get("learners", [])
        return [_to_profile(row) for row in rows]

    return []

