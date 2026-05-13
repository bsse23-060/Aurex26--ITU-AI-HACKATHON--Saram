"""Onboarding endpoints: capture Learning DNA + diagnostic, generate roadmap."""

from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..ai.roadmap import RoadmapInput, generate_roadmap
from ..auth import get_current_user
from ..database import get_db
from ..models import Concept, Course, LearningDNA, Module, RoadmapStep, User
from ..schemas.auth import UserOut
from ..schemas.learner import OnboardingRequest, RoadmapOut, RoadmapStepOut
from ..services.mastery import apply_response

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("/dna-scenarios")
def dna_scenarios():
    """Six lightweight scenarios used to capture the 5-dim Learning DNA."""

    return {
        "scenarios": [
            {
                "id": "modality_1",
                "dim": "modality",
                "prompt": "You want to learn what a Transformer is. You'd rather:",
                "options": [
                    {"label": "Read a 5-minute explainer", "value": 0.0},
                    {"label": "Watch a 5-minute visual walkthrough", "value": 1.0},
                ],
            },
            {
                "id": "depth_1",
                "dim": "depth",
                "prompt": "A new concept clicks better when you:",
                "options": [
                    {"label": "Skim the surface across many examples first", "value": 0.0},
                    {"label": "Go deep into one example end-to-end", "value": 1.0},
                ],
            },
            {
                "id": "pace_1",
                "dim": "pace",
                "prompt": "Your ideal study block is:",
                "options": [
                    {"label": "Short focused 20-minute bursts", "value": 0.2},
                    {"label": "One ~90 minute deep session", "value": 0.9},
                ],
            },
            {
                "id": "abstraction_1",
                "dim": "abstraction",
                "prompt": "Pick the explanation style you prefer:",
                "options": [
                    {"label": "Concrete worked examples first, theory later", "value": 0.0},
                    {"label": "Theory and first principles up-front", "value": 1.0},
                ],
            },
            {
                "id": "time_1",
                "dim": "time_of_day",
                "prompt": "When do you do your best learning?",
                "options": [
                    {"label": "Mornings", "value": 0.2},
                    {"label": "Afternoons", "value": 0.5},
                    {"label": "Evenings / late night", "value": 0.9},
                ],
            },
            {
                "id": "modality_2",
                "dim": "modality",
                "prompt": "When debugging, you usually:",
                "options": [
                    {"label": "Step through the code line by line in your head", "value": 0.2},
                    {"label": "Draw the data flow on paper / a board", "value": 0.9},
                ],
            },
        ]
    }


@router.get("/diagnostic/{course_id}")
def diagnostic(course_id: int, db: Session = Depends(get_db)):
    """Pick one easy quiz item per starting concept for a 5-question diagnostic."""

    course = db.query(Course).options(selectinload(Course.modules)).filter(Course.id == course_id).one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    items = []
    seen_concepts: set[int] = set()
    for module in sorted(course.modules, key=lambda m: m.position):
        for qi in module.quiz_items:
            if qi.concept_id in seen_concepts:
                continue
            if qi.difficulty > 0.45:
                continue
            seen_concepts.add(qi.concept_id)
            concept = db.get(Concept, qi.concept_id)
            items.append(
                {
                    "quiz_item_id": qi.id,
                    "module_id": qi.module_id,
                    "concept_id": qi.concept_id,
                    "concept_slug": concept.slug if concept else "",
                    "prompt": qi.prompt,
                    "options": qi.options,
                }
            )
            if len(items) >= 5:
                break
        if len(items) >= 5:
            break
    return {"course_id": course_id, "items": items}


@router.post("/complete", response_model=RoadmapOut)
def complete_onboarding(
    payload: OnboardingRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RoadmapOut:
    course = db.query(Course).options(selectinload(Course.modules)).filter(Course.id == payload.course_id).one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    user.enrolled_course_id = course.id
    user.goal = payload.goal
    user.prior_experience = payload.prior_experience
    user.weekly_hours = payload.weekly_hours
    user.language_pref = payload.language_pref
    user.onboarded_at = datetime.utcnow()

    dna = db.query(LearningDNA).filter(LearningDNA.user_id == user.id).one_or_none()
    if dna is None:
        dna = LearningDNA(user_id=user.id)
        db.add(dna)
    dna.modality = payload.dna.modality
    dna.depth = payload.dna.depth
    dna.pace = payload.dna.pace
    dna.abstraction = payload.dna.abstraction
    dna.time_of_day = payload.dna.time_of_day

    for ans in payload.diagnostic:
        concept = db.query(Concept).filter(Concept.slug == ans.concept_slug).one_or_none()
        if not concept:
            continue
        apply_response(db, user.id, concept.id, ans.correct)

    # Clear any prior roadmap, regenerate
    db.query(RoadmapStep).filter(RoadmapStep.user_id == user.id).delete()

    modules_payload = [
        {
            "id": m.id,
            "title": m.title,
            "summary": m.summary,
            "position": m.position,
            "estimated_minutes": m.estimated_minutes,
        }
        for m in sorted(course.modules, key=lambda m: m.position)
    ]
    plan, source = generate_roadmap(
        RoadmapInput(
            goal=payload.goal,
            prior_experience=payload.prior_experience,
            weekly_hours=payload.weekly_hours,
            dna=dna.as_dict(),
            diagnostic=[a.model_dump() for a in payload.diagnostic],
            modules=modules_payload,
        )
    )
    steps_out: List[RoadmapStepOut] = []
    for pos, step in enumerate(plan, start=1):
        module = db.get(Module, step.module_id)
        if not module:
            continue
        roadmap_row = RoadmapStep(
            user_id=user.id,
            module_id=module.id,
            position=pos,
            target_week=step.target_week,
            rationale=step.rationale,
            completed=False,
        )
        db.add(roadmap_row)
        steps_out.append(
            RoadmapStepOut(
                position=pos,
                module_id=module.id,
                module_title=module.title,
                module_summary=module.summary,
                target_week=step.target_week,
                rationale=step.rationale,
                completed=False,
                estimated_minutes=module.estimated_minutes,
            )
        )
    db.commit()

    return RoadmapOut(
        course_id=course.id,
        course_title=course.title,
        course_color=course.color,
        steps=steps_out,
        generated_by=source,
    )
