"""Peer Twin matching service."""

from __future__ import annotations

from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from ..ai.recommender import TwinMatch, find_peer_twin
from ..models import Concept, LearningDNA, Mastery, RoadmapStep, User, UserRole


def _profile_for(db: Session, user_id: int) -> Dict[str, float]:
    rows = (
        db.query(Concept.slug, Mastery.p_mastery)
        .join(Mastery, Mastery.concept_id == Concept.id)
        .filter(Mastery.user_id == user_id)
        .all()
    )
    return {slug: float(p) for slug, p in rows}


def _completed_count(db: Session, user_id: int) -> int:
    return (
        db.query(RoadmapStep)
        .filter(RoadmapStep.user_id == user_id, RoadmapStep.completed.is_(True))
        .count()
    )


def _top_strengths(db: Session, user_id: int, k: int = 3) -> List[str]:
    rows = (
        db.query(Concept.name, Mastery.p_mastery)
        .join(Mastery, Mastery.concept_id == Concept.id)
        .filter(Mastery.user_id == user_id)
        .order_by(Mastery.p_mastery.desc())
        .limit(k)
        .all()
    )
    return [name for name, _ in rows]


def find_twin(
    db: Session,
    learner: User,
) -> Optional[Dict]:
    if not learner.enrolled_course_id:
        return None
    profile = _profile_for(db, learner.id)
    dna_row = learner.dna
    dna_vec = dna_row.as_vector() if dna_row else [0.5] * 5
    profile_with_dna = dict(profile)
    profile_with_dna["__dna__"] = dna_vec
    completed = _completed_count(db, learner.id)

    candidates_q = db.query(User).filter(
        User.role == UserRole.student,
        User.enrolled_course_id == learner.enrolled_course_id,
        User.id != learner.id,
    )
    candidates_payload = []
    for cand in candidates_q.all():
        cand_profile = _profile_for(db, cand.id)
        cand_dna = cand.dna.as_vector() if cand.dna else [0.5] * 5
        candidates_payload.append(
            {
                "id": cand.id,
                "profile": cand_profile,
                "dna": cand_dna,
                "completed": _completed_count(db, cand.id),
                "strengths": _top_strengths(db, cand.id),
                "name": cand.full_name,
                "avatar_seed": cand.avatar_seed,
            }
        )

    match: Optional[TwinMatch] = find_peer_twin(
        learner_id=learner.id,
        learner_profile=profile_with_dna,
        learner_completed=completed,
        candidates=candidates_payload,
    )
    if not match:
        return None
    twin_row = next((c for c in candidates_payload if c["id"] == match.twin_id), None)
    if not twin_row:
        return None
    note = (
        f"{twin_row['name'].split()[0]} is {match.modules_ahead} module(s) ahead on the same track "
        f"and your learning DNA aligns by {match.similarity:.0%}. They went deep on "
        f"{', '.join(match.shared_strengths[:2]) or 'core concepts'} - worth comparing notes."
    )
    return {
        "twin_id": twin_row["id"],
        "twin_name": twin_row["name"],
        "avatar_seed": twin_row["avatar_seed"],
        "modules_ahead": match.modules_ahead,
        "similarity": match.similarity,
        "shared_strengths": match.shared_strengths,
        "note": note,
    }
