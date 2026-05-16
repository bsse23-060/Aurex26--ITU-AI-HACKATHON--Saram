"""Lightweight burnout signal, distinct from academic at-risk.

We combine three weak signals:
- engagement drop: weekly minutes trend
- session length: very long single sessions with falling accuracy
- frustration markers in tutor questions (simple keyword sentiment)

Output is a strength in [0,1] and a list of human-readable indicators.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List


FRUSTRATION_MARKERS = {
    # english
    "tired", "exhausted", "burned out", "burnt out", "stressed", "stuck", "frustrated",
    "give up", "giving up", "overwhelmed", "can't focus", "cant focus", "hate this",
    "boring", "lost", "too hard", "too difficult", "no idea",
    # roman urdu
    "thak gaya", "thak gayi", "thaka", "thaki", "tang", "pareshaan", "pareshan",
    "samajh nahi", "samajh nai", "hopeless", "dimag", "burnt", "chor", "chhor", "chorr",
}


@dataclass
class BurnoutSignal:
    strength: float
    indicators: List[str]
    flagged: bool


def detect(
    weekly_minutes_current: float,
    weekly_minutes_previous: float,
    tutor_messages: Iterable[str],
    avg_session_minutes: float,
    recent_accuracy: float,
    days_since_active: int,
) -> BurnoutSignal:
    indicators: List[str] = []
    strength = 0.0

    drop = weekly_minutes_previous - weekly_minutes_current
    if weekly_minutes_previous > 60 and drop / max(1.0, weekly_minutes_previous) > 0.35:
        indicators.append("engagement dropped 35%+ vs last week")
        strength += 0.35

    if avg_session_minutes > 90 and recent_accuracy < 0.55:
        indicators.append("long sessions with falling accuracy")
        strength += 0.25

    if days_since_active >= 5:
        indicators.append(f"inactive for {days_since_active} days")
        strength += 0.10

    frustration_hits = 0
    for msg in tutor_messages:
        if not msg:
            continue
        lowered = msg.lower()
        for marker in FRUSTRATION_MARKERS:
            if marker in lowered:
                frustration_hits += 1
                break
    if frustration_hits >= 2:
        indicators.append("frustration language in tutor chats")
        strength += min(0.35, 0.12 * frustration_hits)

    strength = min(1.0, strength)
    return BurnoutSignal(strength=strength, indicators=indicators, flagged=strength >= 0.45)
