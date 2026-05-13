"""Career Outcome Simulator.

Projects the learner's average mastery at +4 / +12 / +24 weeks based on
their committed weekly hours, then matches the projected skill profile to
seeded Pakistan tech roles.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from sqlalchemy.orm import Session

from ..models import Concept, JobRole, Mastery, Module
from .mastery import mastery_map


HORIZONS = [4, 12, 24]


@dataclass
class RoleMatchOut:
    role: JobRole
    match_pct: float
    weeks_to_ready: int | None
    skill_gaps: List[Dict[str, float | str]]


def _label_for(avg: float) -> str:
    if avg >= 0.85:
        return "career-ready"
    if avg >= 0.65:
        return "strong foundation"
    if avg >= 0.45:
        return "core skills emerging"
    return "early learner"


def _decay_or_grow(current: float, weeks: int, hours: int) -> float:
    growth_per_week = 0.018 * max(1, hours) / 5.0
    raw = current + growth_per_week * weeks
    return max(0.0, min(1.0, raw))


def project_mastery(current_avg: float, weekly_hours: int) -> List[Dict]:
    return [
        {
            "horizon_weeks": h,
            "projected_mastery_avg": _decay_or_grow(current_avg, h, weekly_hours),
            "label": _label_for(_decay_or_grow(current_avg, h, weekly_hours)),
        }
        for h in HORIZONS
    ]


def match_roles(
    db: Session,
    user_id: int,
    weekly_hours: int,
) -> tuple[float, List[Dict], List[Dict]]:
    masteries = mastery_map(db, user_id)
    concept_rows = {c.id: c for c in db.query(Concept).all()}
    concept_by_slug = {c.slug: c for c in concept_rows.values()}
    current_avg = (
        sum(masteries.values()) / len(masteries) if masteries else 0.0
    )

    projections = project_mastery(current_avg, weekly_hours)
    roles = db.query(JobRole).order_by(JobRole.title).all()

    role_payload: List[Dict] = []
    for role in roles:
        required = role.required_concepts or []
        if not required:
            continue
        per_skill = []
        total = 0.0
        for req in required:
            slug = req.get("slug")
            needed = float(req.get("level", 0.6))
            concept = concept_by_slug.get(slug)
            cur = masteries.get(concept.id, 0.0) if concept else 0.0
            total += min(1.0, cur / needed) if needed > 0 else 0.0
            per_skill.append(
                {
                    "concept_slug": slug,
                    "concept_name": concept.name if concept else slug,
                    "current": cur,
                    "required": needed,
                }
            )
        match_pct = (total / len(required)) if required else 0.0

        weeks_ready: int | None = None
        for proj in projections:
            if proj["projected_mastery_avg"] >= 0.65 and proj["projected_mastery_avg"] - current_avg > 0:
                weeks_ready = proj["horizon_weeks"]
                break

        role_payload.append(
            {
                "role_slug": role.slug,
                "role_title": role.title,
                "description": role.description,
                "match_pct": match_pct,
                "weeks_to_ready": weeks_ready,
                "salary_pkr_min": role.salary_pkr_min,
                "salary_pkr_max": role.salary_pkr_max,
                "market_demand": role.market_demand,
                "skill_gaps": [s for s in per_skill if s["current"] < s["required"]][:4],
            }
        )

    role_payload.sort(key=lambda r: -r["match_pct"])
    return current_avg, projections, role_payload
