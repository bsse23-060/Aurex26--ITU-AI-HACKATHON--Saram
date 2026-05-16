"""Feature builders that aggregate engagement events into ML inputs."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import (
    Attempt,
    Course,
    EngagementEvent,
    Module,
    QuizItem,
    RoadmapStep,
    TutorMessage,
    User,
)
from .mastery import average_mastery


def _avg_quiz_score(db: Session, user_id: int, since: Optional[datetime] = None) -> float:
    q = db.query(Attempt).filter(Attempt.user_id == user_id)
    if since:
        q = q.filter(Attempt.created_at >= since)
    rows = q.all()
    if not rows:
        return 0.5
    return sum(1 for r in rows if r.correct) / len(rows)


def _days_since_active(db: Session, user_id: int) -> int:
    last = (
        db.query(func.max(EngagementEvent.created_at))
        .filter(EngagementEvent.user_id == user_id)
        .scalar()
    )
    if last is None:
        last_attempt = (
            db.query(func.max(Attempt.created_at)).filter(Attempt.user_id == user_id).scalar()
        )
        last = last_attempt
    if last is None:
        return 14
    delta = datetime.utcnow() - last
    return max(0, int(delta.total_seconds() // 86400))


def _completion_pct(db: Session, user_id: int) -> float:
    total = db.query(func.count(RoadmapStep.id)).filter(RoadmapStep.user_id == user_id).scalar() or 0
    if total == 0:
        return 0.0
    done = (
        db.query(func.count(RoadmapStep.id))
        .filter(RoadmapStep.user_id == user_id, RoadmapStep.completed.is_(True))
        .scalar()
        or 0
    )
    return done / total


def _weekly_minutes(db: Session, user_id: int) -> Tuple[float, float]:
    """Returns (current_week_minutes, previous_week_minutes)."""

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    def sum_minutes(start: datetime, end: datetime) -> float:
        rows = (
            db.query(EngagementEvent.payload)
            .filter(
                EngagementEvent.user_id == user_id,
                EngagementEvent.kind == "time",
                EngagementEvent.created_at >= start,
                EngagementEvent.created_at < end,
            )
            .all()
        )
        total = 0.0
        for (payload,) in rows:
            try:
                total += float((payload or {}).get("seconds", 0)) / 60.0
            except (TypeError, ValueError):
                continue
        return total

    return sum_minutes(week_ago, now), sum_minutes(two_weeks_ago, week_ago)


def _help_requests(db: Session, user_id: int) -> int:
    return (
        db.query(func.count(TutorMessage.id))
        .filter(TutorMessage.user_id == user_id, TutorMessage.role == "user")
        .scalar()
        or 0
    )


def _confusion_incidents(db: Session, user_id: int) -> int:
    return (
        db.query(func.count(EngagementEvent.id))
        .filter(EngagementEvent.user_id == user_id, EngagementEvent.kind == "confusion")
        .scalar()
        or 0
    )


def _avg_session_minutes(db: Session, user_id: int) -> float:
    rows = (
        db.query(EngagementEvent.payload)
        .filter(EngagementEvent.user_id == user_id, EngagementEvent.kind == "session")
        .all()
    )
    if not rows:
        return 25.0
    durations = []
    for (payload,) in rows:
        try:
            durations.append(float((payload or {}).get("minutes", 0)))
        except (TypeError, ValueError):
            continue
    if not durations:
        return 25.0
    return sum(durations) / len(durations)


def _recent_accuracy(db: Session, user_id: int, n: int = 12) -> float:
    rows = (
        db.query(Attempt.correct)
        .filter(Attempt.user_id == user_id)
        .order_by(Attempt.created_at.desc())
        .limit(n)
        .all()
    )
    if not rows:
        return 0.5
    return sum(1 for (c,) in rows if c) / len(rows)


def _recent_tutor_questions(db: Session, user_id: int, hours: int = 168) -> List[str]:
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = (
        db.query(TutorMessage.content)
        .filter(
            TutorMessage.user_id == user_id,
            TutorMessage.role == "user",
            TutorMessage.created_at >= since,
        )
        .all()
    )
    return [c for (c,) in rows]


def build_at_risk_features(db: Session, user_id: int) -> Dict[str, float]:
    weekly_now, _ = _weekly_minutes(db, user_id)
    return {
        "avg_quiz_score": _avg_quiz_score(db, user_id),
        "days_since_active": float(_days_since_active(db, user_id)),
        "completion_pct": _completion_pct(db, user_id),
        "weekly_minutes": weekly_now,
        "mastery_avg": average_mastery(db, user_id),
        "help_requests": float(_help_requests(db, user_id)),
        "confusion_incidents": float(_confusion_incidents(db, user_id)),
    }


def build_burnout_features(db: Session, user_id: int) -> Dict[str, float]:
    weekly_now, weekly_prev = _weekly_minutes(db, user_id)
    return {
        "weekly_minutes_current": weekly_now,
        "weekly_minutes_previous": weekly_prev,
        "tutor_messages": _recent_tutor_questions(db, user_id),
        "avg_session_minutes": _avg_session_minutes(db, user_id),
        "recent_accuracy": _recent_accuracy(db, user_id),
        "days_since_active": _days_since_active(db, user_id),
    }


def quick_metrics(db: Session, user_id: int) -> Dict[str, float]:
    return {
        "completion_pct": _completion_pct(db, user_id),
        "mastery_avg": average_mastery(db, user_id),
        "days_since_active": _days_since_active(db, user_id),
        "confusion_incidents": _confusion_incidents(db, user_id),
        "tutor_messages": _help_requests(db, user_id),
        "attempts_recent": db.query(func.count(Attempt.id))
        .filter(Attempt.user_id == user_id)
        .scalar() or 0,
    }
