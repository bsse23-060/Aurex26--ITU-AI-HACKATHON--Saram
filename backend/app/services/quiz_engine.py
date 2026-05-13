"""Adaptive quiz engine.

Given a learner and a module, pick a quiz set that:
1. Concentrates on the weakest concept first.
2. Matches each item's difficulty to the learner's current mastery (slightly
   above => productive struggle).
3. Avoids repeating recently-served items where possible.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Sequence, Tuple

from sqlalchemy.orm import Session

from ..ai.knowledge_tracing import difficulty_for_mastery
from ..models import Attempt, Concept, Mastery, Module, QuizItem
from .mastery import mastery_map


@dataclass
class AdaptivePick:
    item: QuizItem
    target_difficulty: float
    why: str


def select_items(
    db: Session,
    user_id: int,
    module: Module,
    n: int = 5,
) -> Tuple[List[AdaptivePick], List[int], str]:
    masteries = mastery_map(db, user_id)
    items: List[QuizItem] = list(module.quiz_items)
    if not items:
        return [], [], "No quiz items in this module yet."

    by_concept: dict[int, List[QuizItem]] = {}
    for item in items:
        by_concept.setdefault(item.concept_id, []).append(item)

    concept_order = sorted(
        by_concept.keys(),
        key=lambda cid: masteries.get(cid, 0.3),
    )
    weak_concept_ids = concept_order[: max(2, len(concept_order) // 2)]

    recent_cutoff = datetime.utcnow() - timedelta(hours=4)
    recent_item_ids = {
        row[0]
        for row in db.query(Attempt.quiz_item_id)
        .filter(Attempt.user_id == user_id, Attempt.created_at >= recent_cutoff)
        .all()
    }

    picks: List[AdaptivePick] = []
    used_ids: set[int] = set()
    rng = random.Random(user_id * 7919 + module.id)
    for concept_id in concept_order:
        candidates = [c for c in by_concept[concept_id] if c.id not in used_ids]
        if not candidates:
            continue
        target = difficulty_for_mastery(masteries.get(concept_id, 0.3))
        fresh = [c for c in candidates if c.id not in recent_item_ids] or candidates
        fresh.sort(key=lambda q: abs(q.difficulty - target))
        chosen = fresh[0]
        used_ids.add(chosen.id)
        why = (
            "Weak spot - matches your current level"
            if concept_id in weak_concept_ids
            else "Reinforces a concept you're improving on"
        )
        picks.append(AdaptivePick(item=chosen, target_difficulty=target, why=why))
        if len(picks) >= n:
            break

    while len(picks) < n:
        leftover = [item for item in items if item.id not in used_ids]
        if not leftover:
            break
        chosen = rng.choice(leftover)
        used_ids.add(chosen.id)
        picks.append(
            AdaptivePick(
                item=chosen,
                target_difficulty=chosen.difficulty,
                why="Filler to round out the quiz",
            )
        )

    if not picks:
        return [], [], "No quiz items in this module yet."

    weakest_name = ""
    weak_ids: List[int] = []
    for cid in weak_concept_ids:
        concept = db.get(Concept, cid)
        if concept:
            weak_ids.append(concept.id)
            if not weakest_name:
                weakest_name = concept.name
    rationale = (
        f"Focusing on '{weakest_name}' first since your mastery there is "
        "the lowest in this module."
    ) if weakest_name else "Selected to match your current level."
    return picks, weak_ids, rationale
