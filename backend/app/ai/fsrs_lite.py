"""FSRS-lite spaced repetition scheduler.

A pragmatic, dependency-free approximation of the Free Spaced Repetition
Scheduler. We do not implement the full DSR (difficulty / stability /
retrievability) model; instead we use a SuperMemo-2 style ease-factor with
forgetting-curve based retrievability so the API matches what FSRS-aware
clients expect: `retrievability` and `schedule_next`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class ReviewResult:
    interval_days: float
    ease: float
    due_at: datetime


def retrievability(last_seen: Optional[datetime], stability_days: float, now: Optional[datetime] = None) -> float:
    """Probability the learner can still recall the concept right now."""

    if last_seen is None:
        return 0.0
    now = now or datetime.utcnow()
    elapsed_days = max(0.0, (now - last_seen).total_seconds() / 86400.0)
    if stability_days <= 0:
        stability_days = 0.5
    return math.exp(-elapsed_days / stability_days)


def schedule_next(
    prior_interval_days: float,
    prior_ease: float,
    rating: int,
    now: Optional[datetime] = None,
) -> ReviewResult:
    """Compute the next review interval.

    rating: 0 = forgot, 1 = hard, 2 = good, 3 = easy.
    """

    now = now or datetime.utcnow()
    ease = max(1.3, prior_ease)
    interval = max(0.25, prior_interval_days)

    if rating <= 0:
        interval = 0.5
        ease = max(1.3, ease - 0.2)
    elif rating == 1:
        interval = max(1.0, interval * 1.2)
        ease = max(1.3, ease - 0.05)
    elif rating == 2:
        interval = max(1.0, interval * ease)
    else:
        interval = max(2.0, interval * ease * 1.3)
        ease = min(3.0, ease + 0.05)

    due_at = now + timedelta(days=interval)
    return ReviewResult(interval_days=interval, ease=ease, due_at=due_at)


def is_due(due_at: Optional[datetime], now: Optional[datetime] = None) -> bool:
    if due_at is None:
        return True
    return (now or datetime.utcnow()) >= due_at
