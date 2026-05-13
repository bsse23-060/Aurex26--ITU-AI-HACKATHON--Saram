"""Skill graph builder for the interactive concept-tree visualisation."""

from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from ..models import Concept, ConceptEdge, Mastery, Module
from .mastery import mastery_map


def build(db: Session, user_id: int, course_id: int) -> dict:
    modules = db.query(Module).filter(Module.course_id == course_id).order_by(Module.position).all()
    module_ids = [m.id for m in modules]
    if not module_ids:
        return {"nodes": [], "edges": []}
    concepts = (
        db.query(Concept).filter(Concept.module_id.in_(module_ids)).all()
    )
    masteries = mastery_map(db, user_id)
    module_titles = {m.id: m.title for m in modules}
    module_positions = {m.id: m.position for m in modules}

    nodes = []
    concept_ids = [c.id for c in concepts]
    for c in concepts:
        p = masteries.get(c.id, 0.0)
        state = "mastered" if p >= 0.8 else "learning" if p >= 0.25 else "locked"
        nodes.append(
            {
                "id": c.id,
                "slug": c.slug,
                "name": c.name,
                "module_id": c.module_id,
                "module_title": module_titles.get(c.module_id, ""),
                "module_position": module_positions.get(c.module_id, 0),
                "course_id": course_id,
                "p_mastery": p,
                "state": state,
            }
        )
    edges_rows = (
        db.query(ConceptEdge)
        .filter(ConceptEdge.src_id.in_(concept_ids), ConceptEdge.dst_id.in_(concept_ids))
        .all()
    )
    edges = [{"src": e.src_id, "dst": e.dst_id} for e in edges_rows]
    return {"nodes": nodes, "edges": edges}
