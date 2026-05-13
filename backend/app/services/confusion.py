"""Behavioural confusion detector.

Triggered from quiz answer submissions. Inputs are aggregated client signals
(time-on-question, retries, scroll reversals, idle time). We use a thresholded
linear scorer rather than ML because we want crisp, explainable triggers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ConfusionVerdict:
    triggered: bool
    score: float
    message: Optional[str]
    reason: str


THRESHOLD = 0.6


def evaluate(
    seconds_on_task: float,
    retries: int = 0,
    scroll_reversals: int = 0,
    idle_seconds: float = 0.0,
    was_correct: Optional[bool] = None,
    question_difficulty: float = 0.5,
) -> ConfusionVerdict:
    score = 0.0
    reasons = []

    time_threshold = 60.0 + 90.0 * question_difficulty
    if seconds_on_task >= time_threshold:
        score += min(0.5, (seconds_on_task - time_threshold) / 180.0 + 0.2)
        reasons.append(f"spent {int(seconds_on_task)}s on this item")

    if retries >= 1:
        score += 0.2 * retries
        reasons.append(f"{retries} retry attempt(s)")

    if scroll_reversals >= 3:
        score += 0.15
        reasons.append("re-read multiple times")

    if idle_seconds >= 25:
        score += 0.15
        reasons.append("long idle pause")

    if was_correct is False and seconds_on_task > 25:
        score += 0.15
        reasons.append("incorrect after extended thought")

    score = min(1.0, score)
    triggered = score >= THRESHOLD

    if triggered:
        msg = (
            "Looks like this one's tricky - want me to break it down a different way?"
        )
    else:
        msg = None

    return ConfusionVerdict(
        triggered=triggered,
        score=score,
        message=msg,
        reason="; ".join(reasons) if reasons else "no signals",
    )
