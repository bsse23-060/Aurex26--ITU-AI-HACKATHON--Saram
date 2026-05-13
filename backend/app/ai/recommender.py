"""Embedding-based content recommender + Peer Twin matcher.

Recommendations use cosine similarity between the learner's interest vector
(weak concepts + module being viewed) and module description embeddings.

Peer Twin matching builds, for each candidate, a concatenated vector of
mastery profile + Learning DNA, and finds the nearest peer who is slightly
ahead on the same course.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

import numpy as np


def _safe_cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom <= 1e-9:
        return 0.0
    return float(np.dot(a, b) / denom)


@dataclass
class ModuleRec:
    module_id: int
    score: float
    reason: str


def recommend_modules(
    learner_vec: List[float],
    module_vecs: Sequence[Tuple[int, List[float]]],
    completed_ids: set[int],
    current_module_id: int | None,
    top_k: int = 3,
) -> List[ModuleRec]:
    if not learner_vec or not module_vecs:
        return []
    learner = np.asarray(learner_vec, dtype=np.float32)
    scored: List[ModuleRec] = []
    for module_id, vec in module_vecs:
        if module_id in completed_ids or module_id == current_module_id:
            continue
        sim = _safe_cosine(learner, np.asarray(vec, dtype=np.float32))
        reason = (
            "Closely matches what you've been struggling with."
            if sim > 0.6
            else "Builds skills adjacent to your current module."
        )
        scored.append(ModuleRec(module_id=module_id, score=sim, reason=reason))
    scored.sort(key=lambda m: -m.score)
    return scored[:top_k]


@dataclass
class TwinMatch:
    twin_id: int
    similarity: float
    modules_ahead: int
    shared_strengths: List[str]


def find_peer_twin(
    learner_id: int,
    learner_profile: Dict[str, float],
    learner_completed: int,
    candidates: List[Dict],
) -> TwinMatch | None:
    """candidates: [{id, profile: {concept_slug: mastery}, dna: [..], completed: int, strengths: [..]}]"""

    if not candidates:
        return None

    keys = sorted({slug for c in candidates for slug in c.get("profile", {}).keys()} | set(learner_profile.keys()))
    if not keys:
        return None

    def to_vec(profile: Dict[str, float], dna: List[float]) -> np.ndarray:
        mastery = np.array([profile.get(k, 0.0) for k in keys], dtype=np.float32)
        dna_arr = np.array(dna or [0.5] * 5, dtype=np.float32)
        return np.concatenate([mastery, 0.5 * dna_arr])

    learner_dna = learner_profile.get("__dna__", [0.5] * 5)
    learner_vec = to_vec(learner_profile, learner_dna)

    best: TwinMatch | None = None
    for cand in candidates:
        if cand["id"] == learner_id:
            continue
        ahead = cand["completed"] - learner_completed
        if ahead <= 0 or ahead > 4:
            continue
        cand_vec = to_vec(cand.get("profile", {}), cand.get("dna", [0.5] * 5))
        sim = _safe_cosine(learner_vec, cand_vec)
        if best is None or sim > best.similarity:
            best = TwinMatch(
                twin_id=cand["id"],
                similarity=sim,
                modules_ahead=ahead,
                shared_strengths=cand.get("strengths", []),
            )
    return best
