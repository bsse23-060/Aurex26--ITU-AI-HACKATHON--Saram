"""Skill graph, career simulator, and peer twin endpoints (student-facing)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_student
from ..database import get_db
from ..models import User
from ..schemas.courses import SkillGraphEdge, SkillGraphNode, SkillGraphOut
from ..schemas.learner import (
    CareerOut,
    CareerProjection,
    CareerRoleMatch,
    CareerSkillGap,
    PeerTwinOut,
)
from ..services.career import match_roles
from ..services.skill_graph import build as build_graph
from ..services.twin import find_twin

router = APIRouter(prefix="/api/student", tags=["student-extras"])


@router.get("/skill-graph", response_model=SkillGraphOut)
def skill_graph(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> SkillGraphOut:
    if not user.enrolled_course_id:
        raise HTTPException(status_code=400, detail="Not enrolled in a course yet")
    raw = build_graph(db, user.id, user.enrolled_course_id)
    nodes = [
        SkillGraphNode(
            id=n["id"],
            slug=n["slug"],
            name=n["name"],
            module_id=n["module_id"],
            module_title=n["module_title"],
            course_id=n["course_id"],
            p_mastery=n["p_mastery"],
            state=n["state"],
        )
        for n in raw["nodes"]
    ]
    edges = [SkillGraphEdge(src=e["src"], dst=e["dst"]) for e in raw["edges"]]
    return SkillGraphOut(nodes=nodes, edges=edges)


@router.get("/career", response_model=CareerOut)
def career(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> CareerOut:
    current_avg, projections, roles = match_roles(db, user.id, user.weekly_hours or 5)
    return CareerOut(
        current_mastery_avg=current_avg,
        weekly_hours=user.weekly_hours or 5,
        projections=[CareerProjection(**p) for p in projections],
        roles=[
            CareerRoleMatch(
                role_slug=r["role_slug"],
                role_title=r["role_title"],
                description=r["description"],
                match_pct=r["match_pct"],
                weeks_to_ready=r["weeks_to_ready"],
                salary_pkr_min=r["salary_pkr_min"],
                salary_pkr_max=r["salary_pkr_max"],
                market_demand=r["market_demand"],
                skill_gaps=[CareerSkillGap(**g) for g in r["skill_gaps"]],
            )
            for r in roles
        ],
    )


@router.get("/twin", response_model=PeerTwinOut | None)
def twin(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> PeerTwinOut | None:
    result = find_twin(db, user)
    if not result:
        return None
    return PeerTwinOut(**result)
