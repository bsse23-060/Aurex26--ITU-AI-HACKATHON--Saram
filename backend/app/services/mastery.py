"""Helpers for reading + updating BKT mastery and the FSRS-lite review queue."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai import fsrs_lite
from ..ai.knowledge_tracing import (
    DEFAULT_PARAMS,
    initial_mastery,
    is_mastered,
    update_mastery,
)
from ..models import Concept, Mastery, ReviewQueue


def get_or_create_mastery(db: Session, user_id: int, concept_id: int) -> Mastery:
    row = (
        db.query(Mastery)
        .filter(Mastery.user_id == user_id, Mastery.concept_id == concept_id)
        .one_or_none()
    )
    if row is None:
        row = Mastery(user_id=user_id, concept_id=concept_id, p_mastery=initial_mastery())
        db.add(row)
        db.flush()
    return row


def apply_response(
    db: Session,
    user_id: int,
    concept_id: int,
    correct: bool,
) -> Tuple[float, float]:
    """Returns (before, after) mastery probabilities."""

    row = get_or_create_mastery(db, user_id, concept_id)
    before = row.p_mastery
    after = update_mastery(before, correct, DEFAULT_PARAMS)
    row.p_mastery = after
    row.last_seen = datetime.utcnow()

    rating = 0 if not correct else (3 if after >= 0.85 else 2 if after >= 0.6 else 1)
    rq = (
        db.query(ReviewQueue)
        .filter(ReviewQueue.user_id == user_id, ReviewQueue.concept_id == concept_id)
        .one_or_none()
    )
    if rq is None:
        rq = ReviewQueue(
            user_id=user_id,
            concept_id=concept_id,
            interval_days=1.0,
            ease=2.5,
            due_at=datetime.utcnow(),
        )
        db.add(rq)
    result = fsrs_lite.schedule_next(rq.interval_days, rq.ease, rating)
    rq.interval_days = result.interval_days
    rq.ease = result.ease
    rq.due_at = result.due_at
    row.stability_days = max(0.5, result.interval_days)
    return before, after


def mastery_map(db: Session, user_id: int) -> Dict[int, float]:
    rows = db.query(Mastery).filter(Mastery.user_id == user_id).all()
    return {row.concept_id: row.p_mastery for row in rows}


def due_concept_ids(db: Session, user_id: int, concept_ids: Iterable[int]) -> List[int]:
    ids = list(concept_ids)
    if not ids:
        return []
    rows = (
        db.query(ReviewQueue)
        .filter(ReviewQueue.user_id == user_id, ReviewQueue.concept_id.in_(ids))
        .all()
    )
    now = datetime.utcnow()
    due: List[int] = []
    for row in rows:
        if fsrs_lite.is_due(row.due_at, now):
            due.append(row.concept_id)
    return due


def average_mastery(db: Session, user_id: int) -> float:
    rows = db.query(Mastery.p_mastery).filter(Mastery.user_id == user_id).all()
    if not rows:
        return 0.0
    values = [r[0] for r in rows]
    return sum(values) / len(values)
