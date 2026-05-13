"""Student-facing endpoints: dashboard, modules, quiz, roadmap, recommendations."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..ai.embeddings import embed_text, embed_texts
from ..ai.recommender import recommend_modules
from ..auth import get_current_user, require_student
from ..database import get_db
from ..models import (
    Attempt,
    Concept,
    Course,
    EngagementEvent,
    LearningDNA,
    Mastery,
    Module,
    QuizItem,
    RoadmapStep,
    User,
)
from ..schemas.courses import (
    ConceptOut,
    ModuleDetailOut,
    ModuleOut,
)
from ..schemas.learner import (
    DNAVector,
    MasteryOut,
    RecommendationOut,
    RoadmapOut,
    RoadmapStepOut,
)
from ..schemas.quiz import (
    AdaptiveQuizOut,
    ConceptMasteryDelta,
    QuizAnswerRequest,
    QuizAnswerResult,
)
from ..schemas.tutor import EngagementEventIn
from ..services import quiz_engine
from ..services.confusion import evaluate as evaluate_confusion
from ..services.mastery import apply_response, due_concept_ids, mastery_map

router = APIRouter(prefix="/api/student", tags=["student"])


def _course_for(user: User, db: Session) -> Course:
    if not user.enrolled_course_id:
        raise HTTPException(status_code=400, detail="Not enrolled in a course yet")
    course = (
        db.query(Course)
        .options(selectinload(Course.modules))
        .filter(Course.id == user.enrolled_course_id)
        .one_or_none()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("/roadmap", response_model=RoadmapOut)
def get_roadmap(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> RoadmapOut:
    course = _course_for(user, db)
    rows = (
        db.query(RoadmapStep)
        .filter(RoadmapStep.user_id == user.id)
        .order_by(RoadmapStep.position)
        .all()
    )
    steps: List[RoadmapStepOut] = []
    for row in rows:
        module = db.get(Module, row.module_id)
        if not module:
            continue
        steps.append(
            RoadmapStepOut(
                id=row.id,
                position=row.position,
                module_id=row.module_id,
                module_title=module.title,
                module_summary=module.summary,
                target_week=row.target_week,
                rationale=row.rationale,
                completed=row.completed,
                estimated_minutes=module.estimated_minutes,
            )
        )
    return RoadmapOut(
        course_id=course.id,
        course_title=course.title,
        course_color=course.color,
        steps=steps,
        generated_by="rules",
    )


@router.get("/dna", response_model=DNAVector)
def get_dna(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> DNAVector:
    dna = db.query(LearningDNA).filter(LearningDNA.user_id == user.id).one_or_none()
    if not dna:
        return DNAVector(modality=0.5, depth=0.5, pace=0.5, abstraction=0.5, time_of_day=0.5)
    return DNAVector(**dna.as_dict())


@router.get("/mastery", response_model=List[MasteryOut])
def list_mastery(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> List[MasteryOut]:
    course = _course_for(user, db)
    module_ids = [m.id for m in course.modules]
    rows = (
        db.query(Mastery, Concept)
        .join(Concept, Concept.id == Mastery.concept_id)
        .filter(Mastery.user_id == user.id, Concept.module_id.in_(module_ids))
        .all()
    )
    return [
        MasteryOut(
            concept_id=concept.id,
            concept_slug=concept.slug,
            concept_name=concept.name,
            module_id=concept.module_id,
            p_mastery=mast.p_mastery,
            last_seen=mast.last_seen.isoformat() if mast.last_seen else None,
        )
        for mast, concept in rows
    ]


@router.get("/modules/{module_id}", response_model=ModuleDetailOut)
def module_detail(
    module_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> ModuleDetailOut:
    module = (
        db.query(Module)
        .options(selectinload(Module.concepts))
        .filter(Module.id == module_id)
        .one_or_none()
    )
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    course = db.get(Course, module.course_id)
    concept_objs = list(module.concepts)
    concept_ids = [c.id for c in concept_objs]

    from ..models import ConceptEdge

    refresher: List[Concept] = []
    prereq_ids: List[int] = []
    if concept_ids:
        edges = (
            db.query(ConceptEdge)
            .filter(ConceptEdge.dst_id.in_(concept_ids))
            .all()
        )
        prereq_ids = [e.src_id for e in edges if e.src_id not in concept_ids]
    due_ids = due_concept_ids(db, user.id, prereq_ids) if prereq_ids else []
    if due_ids:
        refresher = db.query(Concept).filter(Concept.id.in_(due_ids)).all()

    # Module recommendations: embed module summaries within the same course, find closest
    related_recs: List[ModuleOut] = []
    if course is not None:
        other_modules = [m for m in course.modules if m.id != module.id]
        if other_modules:
            texts = [f"{m.title}. {m.summary}" for m in other_modules]
            try:
                vecs = embed_texts(texts)
                masteries = mastery_map(db, user.id)
                # learner vector: weighted weakness across concepts in this module
                weak_text = " ".join(
                    f"{c.name}: {c.description}"
                    for c in sorted(concept_objs, key=lambda c: masteries.get(c.id, 0.3))[:2]
                ) or f"{module.title} {module.summary}"
                learner_vec = embed_text(weak_text)
                completed = {row.module_id for row in db.query(RoadmapStep).filter(
                    RoadmapStep.user_id == user.id, RoadmapStep.completed.is_(True)
                )}
                recs = recommend_modules(
                    learner_vec,
                    list(zip([m.id for m in other_modules], vecs)),
                    completed_ids=completed,
                    current_module_id=module.id,
                    top_k=3,
                )
                rec_lookup = {m.id: m for m in other_modules}
                for rec in recs:
                    m = rec_lookup.get(rec.module_id)
                    if m:
                        related_recs.append(ModuleOut.model_validate(m))
            except Exception:  # noqa: BLE001 - embed fail shouldn't break the page
                related_recs = []

    detail = ModuleDetailOut(
        id=module.id,
        course_id=module.course_id,
        slug=module.slug,
        title=module.title,
        summary=module.summary,
        content_md=module.content_md,
        estimated_minutes=module.estimated_minutes,
        position=module.position,
        concepts=[ConceptOut.model_validate(c) for c in concept_objs],
        refresher_concepts=[ConceptOut.model_validate(c) for c in refresher],
        related_recommendations=related_recs,
    )

    db.add(
        EngagementEvent(
            user_id=user.id,
            kind="module_open",
            module_id=module.id,
            payload={},
        )
    )
    db.commit()
    return detail


@router.get("/modules/{module_id}/quiz", response_model=AdaptiveQuizOut)
def adaptive_quiz(
    module_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> AdaptiveQuizOut:
    module = (
        db.query(Module)
        .options(selectinload(Module.quiz_items))
        .filter(Module.id == module_id)
        .one_or_none()
    )
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    picks, weak_ids, rationale = quiz_engine.select_items(db, user.id, module, n=5)
    return AdaptiveQuizOut(
        module_id=module.id,
        items=[
            {
                "id": p.item.id,
                "module_id": p.item.module_id,
                "concept_id": p.item.concept_id,
                "prompt": p.item.prompt,
                "options": p.item.options,
                "difficulty": p.item.difficulty,
            }
            for p in picks
        ],
        weak_concept_ids=weak_ids,
        rationale=rationale,
    )


@router.post("/quiz/answer", response_model=QuizAnswerResult)
def submit_answer(
    payload: QuizAnswerRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> QuizAnswerResult:
    item = db.get(QuizItem, payload.quiz_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Quiz item not found")
    correct = payload.selected_index == item.answer_index
    attempt = Attempt(
        user_id=user.id,
        quiz_item_id=item.id,
        selected_index=payload.selected_index,
        correct=correct,
        seconds=payload.seconds,
        retries=payload.retries,
    )
    db.add(attempt)

    before, after = apply_response(db, user.id, item.concept_id, correct)

    verdict = evaluate_confusion(
        seconds_on_task=payload.seconds,
        retries=payload.retries,
        was_correct=correct,
        question_difficulty=item.difficulty,
    )
    if verdict.triggered:
        db.add(
            EngagementEvent(
                user_id=user.id,
                kind="confusion",
                module_id=item.module_id,
                payload={
                    "quiz_item_id": item.id,
                    "score": verdict.score,
                    "reason": verdict.reason,
                },
            )
        )

    concept = db.get(Concept, item.concept_id)
    db.commit()
    return QuizAnswerResult(
        quiz_item_id=item.id,
        correct=correct,
        correct_index=item.answer_index,
        explanation=item.explanation,
        mastery_delta=ConceptMasteryDelta(
            concept_id=concept.id if concept else item.concept_id,
            concept_name=concept.name if concept else "",
            before=before,
            after=after,
        ),
        confusion_triggered=verdict.triggered,
        confusion_message=verdict.message,
    )


@router.post("/roadmap/{step_id}/complete", response_model=RoadmapStepOut)
def complete_roadmap_step(
    step_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
) -> RoadmapStepOut:
    row = (
        db.query(RoadmapStep)
        .filter(RoadmapStep.id == step_id, RoadmapStep.user_id == user.id)
        .one_or_none()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Roadmap step not found")
    row.completed = True
    module = db.get(Module, row.module_id)
    db.commit()
    return RoadmapStepOut(
        id=row.id,
        position=row.position,
        module_id=row.module_id,
        module_title=module.title if module else "",
        module_summary=module.summary if module else "",
        target_week=row.target_week,
        rationale=row.rationale,
        completed=row.completed,
        estimated_minutes=module.estimated_minutes if module else 25,
    )


@router.post("/events")
def log_event(
    payload: EngagementEventIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.add(
        EngagementEvent(
            user_id=user.id,
            kind=payload.kind,
            module_id=payload.module_id,
            payload=payload.payload,
        )
    )
    db.commit()
    return {"ok": True}
