"""Personalised learning-roadmap generator.

We ask Gemini for a structured JSON plan; we strictly validate it; we always
keep a deterministic rule-based fallback so that the demo continues even when
the LLM call is rate-limited or the key is missing.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import List, Optional

from pydantic import BaseModel, Field, ValidationError

from ..config import settings

_log = logging.getLogger(__name__)


class RoadmapStepPlan(BaseModel):
    module_id: int
    target_week: int = Field(ge=1, le=52)
    rationale: str = Field(min_length=4, max_length=320)


@dataclass
class RoadmapInput:
    goal: str
    prior_experience: str
    weekly_hours: int
    dna: dict
    diagnostic: list
    modules: list  # list of {id, title, summary, position}


def _rule_based_plan(payload: RoadmapInput) -> List[RoadmapStepPlan]:
    """Always returns an ordered plan grounded in module position + DNA hints."""

    modules = sorted(payload.modules, key=lambda m: m["position"])
    pace_factor = 1.0 + (1.0 - payload.dna.get("pace", 0.5)) * 0.8
    minutes_per_week = max(60, payload.weekly_hours * 60)

    steps: List[RoadmapStepPlan] = []
    cursor_minutes = 0
    week = 1
    is_beginner = payload.prior_experience.lower() in {"beginner", "none", "fresh"}

    for module in modules:
        est = max(20, int(module.get("estimated_minutes", 25)))
        cursor_minutes += int(est * pace_factor)
        if cursor_minutes > minutes_per_week:
            week += 1
            cursor_minutes = est

        if is_beginner and module["position"] <= 2:
            why = "Foundational concept; we'll cover it slowly with extra worked examples."
        elif payload.dna.get("depth", 0.5) > 0.65:
            why = "Goes deep into the theory you said you enjoy."
        elif payload.dna.get("modality", 0.5) > 0.65:
            why = "Heavy on visuals and diagrams - matches your preferred learning style."
        else:
            why = "Builds directly on what you just completed and unlocks the next module."

        steps.append(
            RoadmapStepPlan(
                module_id=module["id"],
                target_week=week,
                rationale=why,
            )
        )

    return steps


def _extract_json_array(raw: str) -> Optional[list]:
    if not raw:
        return None
    raw = raw.strip()
    fence = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", raw, re.DOTALL)
    if fence:
        raw = fence.group(1)
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None


def _gemini_plan(payload: RoadmapInput) -> Optional[List[RoadmapStepPlan]]:
    if not settings.has_gemini:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = _build_prompt(payload)
        resp = model.generate_content(prompt)
        text = getattr(resp, "text", "") or ""
        items = _extract_json_array(text)
        if not items:
            return None
        plan: List[RoadmapStepPlan] = []
        seen_ids = set()
        valid_ids = {m["id"] for m in payload.modules}
        for item in items:
            try:
                step = RoadmapStepPlan(**item)
            except (ValidationError, TypeError):
                continue
            if step.module_id in seen_ids or step.module_id not in valid_ids:
                continue
            seen_ids.add(step.module_id)
            plan.append(step)
        missing = [m for m in payload.modules if m["id"] not in seen_ids]
        if missing:
            last_week = plan[-1].target_week if plan else 1
            for mod in sorted(missing, key=lambda m: m["position"]):
                last_week += 1
                plan.append(
                    RoadmapStepPlan(
                        module_id=mod["id"],
                        target_week=min(52, last_week),
                        rationale="Added to complete your roadmap coverage.",
                    )
                )
        return plan or None
    except Exception as exc:  # noqa: BLE001 - never bubble LLM errors to the UI
        _log.warning("Gemini roadmap failed, falling back to rules: %s", exc)
        return None


def _build_prompt(payload: RoadmapInput) -> str:
    modules_block = "\n".join(
        f"- id={m['id']} | position={m['position']} | title={m['title']} | summary={m['summary']}"
        for m in sorted(payload.modules, key=lambda m: m["position"])
    )
    dna_block = ", ".join(f"{k}={v:.2f}" for k, v in payload.dna.items())
    diag_block = ", ".join(
        f"{a.get('concept_slug', '?')}={'ok' if a.get('correct') else 'miss'}"
        for a in payload.diagnostic
    ) or "none"

    return f"""
You are atomcamp's adaptive learning planner. Given a learner profile and the
available modules of their chosen track, produce an ORDERED study plan as a
JSON array. Each element must have keys: module_id (int), target_week (int>=1),
rationale (1-2 friendly sentences, max 200 chars, no markdown).

The plan MUST include every module exactly once. Order them so prerequisites
come first. Use the Learning DNA + diagnostic to tailor the rationale - e.g.
mention pacing for low pace, visuals for high modality, extra practice for
weak diagnostic concepts. Keep rationales specific to the learner.

LEARNER GOAL: {payload.goal}
PRIOR EXPERIENCE: {payload.prior_experience}
WEEKLY HOURS AVAILABLE: {payload.weekly_hours}
LEARNING DNA (each 0..1): {dna_block}
DIAGNOSTIC RESULTS: {diag_block}

AVAILABLE MODULES:
{modules_block}

Return ONLY the JSON array - no prose, no markdown fence required.
""".strip()


def generate_roadmap(payload: RoadmapInput) -> tuple[List[RoadmapStepPlan], str]:
    """Returns (plan, source) where source is 'gemini' or 'rules'."""

    plan = _gemini_plan(payload)
    if plan:
        return plan, "gemini"
    return _rule_based_plan(payload), "rules"
