"""Instructor + admin dashboards with at-risk + burnout intelligence."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Float, case, cast, func
from sqlalchemy.orm import Session

from ..ai import at_risk as at_risk_ai
from ..ai import burnout as burnout_ai
from ..auth import require_admin, require_instructor
from ..database import get_db
from ..models import (
    Attempt,
    Concept,
    Course,
    EngagementEvent,
    Mastery,
    Module,
    QuizItem,
    RoadmapStep,
    TutorMessage,
    User,
    UserRole,
)
from ..schemas.instructor import (
    AdminAnalyticsOut,
    AtRiskStudentOut,
    BurnoutFlagOut,
    ConceptMasteryAgg,
    CourseAnalyticsOut,
    FailureModeAgg,
    HardestItem,
    InstructorDashboardOut,
    OutcomeFunnelStep,
    RiskReason,
    StudentDetailOut,
    TrackHealth,
)
from ..services.engagement import (
    build_at_risk_features,
    build_burnout_features,
    quick_metrics,
)
from ..services.mastery import average_mastery

router = APIRouter(prefix="/api", tags=["instructor"])


def _band_color(prob: float) -> str:
    return "high" if prob >= 0.66 else "medium" if prob >= 0.33 else "low"


def _student_summary(db: Session, user: User) -> AtRiskStudentOut:
    features = build_at_risk_features(db, user.id)
    pred = at_risk_ai.predict(features)
    burnout_feats = build_burnout_features(db, user.id)
    burnout = burnout_ai.detect(**burnout_feats)

    completion = features["completion_pct"]
    mastery_avg = features["mastery_avg"]
    days = int(features["days_since_active"])

    course = db.get(Course, user.enrolled_course_id) if user.enrolled_course_id else None

    return AtRiskStudentOut(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        avatar_seed=user.avatar_seed,
        course_id=course.id if course else None,
        course_title=course.title if course else None,
        risk_prob=pred.risk_prob,
        risk_band=pred.risk_band,
        burnout_flag=burnout.flagged,
        mastery_avg=mastery_avg,
        days_since_active=days,
        completion_pct=completion,
        top_reasons=[
            RiskReason(feature=r.feature, label=r.label, contribution=r.contribution)
            for r in pred.top_reasons
        ],
    )


@router.get("/instructor/dashboard", response_model=InstructorDashboardOut)
def instructor_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_instructor),
) -> InstructorDashboardOut:
    course = None
    if user.role == UserRole.instructor:
        course = (
            db.query(Course).filter(Course.instructor_id == user.id).order_by(Course.id).first()
        )
    students_q = db.query(User).filter(User.role == UserRole.student)
    if course is not None:
        students_q = students_q.filter(User.enrolled_course_id == course.id)
    students = students_q.all()

    summaries = [_student_summary(db, s) for s in students]
    summaries.sort(key=lambda s: -s.risk_prob)

    week_ago = datetime.utcnow() - timedelta(days=7)
    active = sum(1 for s in summaries if s.days_since_active <= 7)

    avg_completion = (sum(s.completion_pct for s in summaries) / len(summaries)) if summaries else 0.0
    avg_mastery = (sum(s.mastery_avg for s in summaries) / len(summaries)) if summaries else 0.0
    high_risk = sum(1 for s in summaries if s.risk_band == "high")
    burnout_count = sum(1 for s in summaries if s.burnout_flag)

    return InstructorDashboardOut(
        instructor_id=user.id,
        course_id=course.id if course else None,
        course_title=course.title if course else None,
        total_students=len(summaries),
        active_last_7d=active,
        avg_completion_pct=avg_completion,
        avg_mastery=avg_mastery,
        high_risk_count=high_risk,
        burnout_count=burnout_count,
        students=summaries,
    )


@router.get("/instructor/students/{user_id}", response_model=StudentDetailOut)
def student_detail(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_instructor),
) -> StudentDetailOut:
    target = db.get(User, user_id)
    if not target or target.role != UserRole.student:
        raise HTTPException(status_code=404, detail="Student not found")
    summary = _student_summary(db, target)
    course = db.get(Course, target.enrolled_course_id) if target.enrolled_course_id else None

    # Concept-level mastery for this student
    concept_rows = (
        db.query(Concept, Mastery)
        .outerjoin(Mastery, (Mastery.concept_id == Concept.id) & (Mastery.user_id == target.id))
        .filter(Concept.module_id.in_(
            db.query(Module.id).filter(Module.course_id == (course.id if course else -1))
        ))
        .all()
    )
    cm: List[ConceptMasteryAgg] = []
    cohort = (
        db.query(Concept.id, Concept.name, Module.id, Module.title, func.avg(Mastery.p_mastery))
        .join(Mastery, Mastery.concept_id == Concept.id)
        .join(Module, Module.id == Concept.module_id)
        .filter(Module.course_id == (course.id if course else -1))
        .group_by(Concept.id, Module.id)
        .all()
    )
    cohort_map = {row[0]: float(row[4] or 0.0) for row in cohort}
    for concept, mastery in concept_rows:
        p = mastery.p_mastery if mastery else 0.0
        module = db.get(Module, concept.module_id)
        cohort_avg = cohort_map.get(concept.id, 0.0)
        cm.append(
            ConceptMasteryAgg(
                concept_id=concept.id,
                concept_name=concept.name,
                module_id=concept.module_id,
                module_title=module.title if module else "",
                avg_mastery=p,
                learners_struggling=1 if p < cohort_avg - 0.15 else 0,
            )
        )

    recent_attempts = (
        db.query(func.count(Attempt.id))
        .filter(Attempt.user_id == target.id, Attempt.created_at >= datetime.utcnow() - timedelta(days=14))
        .scalar()
        or 0
    )
    recent_tutor_q = (
        db.query(func.count(TutorMessage.id))
        .filter(
            TutorMessage.user_id == target.id,
            TutorMessage.role == "user",
            TutorMessage.created_at >= datetime.utcnow() - timedelta(days=14),
        )
        .scalar()
        or 0
    )
    confusion_incidents = (
        db.query(func.count(EngagementEvent.id))
        .filter(EngagementEvent.user_id == target.id, EngagementEvent.kind == "confusion")
        .scalar()
        or 0
    )

    return StudentDetailOut(
        user_id=target.id,
        full_name=target.full_name,
        email=target.email,
        avatar_seed=target.avatar_seed,
        role=target.role.value if hasattr(target.role, "value") else str(target.role),
        course_id=course.id if course else None,
        course_title=course.title if course else None,
        dna=target.dna.as_dict() if target.dna else None,
        weekly_hours=target.weekly_hours,
        goal=target.goal,
        mastery_avg=summary.mastery_avg,
        completion_pct=summary.completion_pct,
        risk_prob=summary.risk_prob,
        burnout_flag=summary.burnout_flag,
        top_reasons=summary.top_reasons,
        recent_attempts=int(recent_attempts),
        recent_tutor_questions=int(recent_tutor_q),
        concept_mastery=cm,
        confusion_incidents=int(confusion_incidents),
    )


@router.get("/instructor/courses/{course_id}/analytics", response_model=CourseAnalyticsOut)
def course_analytics(
    course_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_instructor),
) -> CourseAnalyticsOut:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    module_ids = [m.id for m in course.modules]

    cm_rows = (
        db.query(
            Concept.id,
            Concept.name,
            Module.id,
            Module.title,
            func.avg(Mastery.p_mastery),
            func.count(Mastery.id),
        )
        .join(Module, Module.id == Concept.module_id)
        .outerjoin(Mastery, Mastery.concept_id == Concept.id)
        .filter(Module.course_id == course_id)
        .group_by(Concept.id, Module.id)
        .all()
    )
    concept_mastery = [
        ConceptMasteryAgg(
            concept_id=cid,
            concept_name=cname,
            module_id=mid,
            module_title=mtitle,
            avg_mastery=float(avg or 0.0),
            learners_struggling=int(count or 0) if (avg or 1.0) < 0.5 else 0,
        )
        for cid, cname, mid, mtitle, avg, count in cm_rows
    ]

    fm_rows = (
        db.query(QuizItem.failure_mode, func.count(Attempt.id))
        .join(Attempt, Attempt.quiz_item_id == QuizItem.id)
        .filter(QuizItem.module_id.in_(module_ids), Attempt.correct.is_(False))
        .group_by(QuizItem.failure_mode)
        .order_by(func.count(Attempt.id).desc())
        .all()
    )
    failure_modes = [FailureModeAgg(failure_mode=m, count=int(c)) for m, c in fm_rows]

    accuracy_expr = func.avg(case((Attempt.correct.is_(True), 1.0), else_=0.0))
    hardest_rows = (
        db.query(
            QuizItem.id,
            QuizItem.prompt,
            Concept.name,
            Module.title,
            accuracy_expr,
        )
        .join(Attempt, Attempt.quiz_item_id == QuizItem.id)
        .join(Concept, Concept.id == QuizItem.concept_id)
        .join(Module, Module.id == QuizItem.module_id)
        .filter(Module.course_id == course_id)
        .group_by(QuizItem.id, Concept.name, Module.title)
        .order_by(accuracy_expr.asc())
        .limit(5)
        .all()
    )
    hardest = [
        HardestItem(
            quiz_item_id=qi,
            module_title=mt,
            concept_name=cn,
            prompt=pr,
            accuracy=float(acc or 0.0),
        )
        for qi, pr, cn, mt, acc in hardest_rows
    ]

    return CourseAnalyticsOut(
        course_id=course.id,
        course_title=course.title,
        concept_mastery=concept_mastery,
        failure_modes=failure_modes,
        hardest_items=hardest,
    )


@router.get("/admin/analytics", response_model=AdminAnalyticsOut)
def admin_analytics(
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> AdminAnalyticsOut:
    week_ago = datetime.utcnow() - timedelta(days=7)
    total_students = db.query(func.count(User.id)).filter(User.role == UserRole.student).scalar() or 0
    total_instructors = db.query(func.count(User.id)).filter(User.role == UserRole.instructor).scalar() or 0
    active_last_7d = (
        db.query(func.count(func.distinct(EngagementEvent.user_id)))
        .filter(EngagementEvent.created_at >= week_ago)
        .scalar()
        or 0
    )

    courses = db.query(Course).all()
    tracks: List[TrackHealth] = []
    cohort_mastery_sum = 0.0
    cohort_mastery_count = 0
    onboarded = 0
    active = 0
    completed_at_least_half = 0
    projected_ready = 0

    for course in courses:
        students = (
            db.query(User).filter(User.role == UserRole.student, User.enrolled_course_id == course.id).all()
        )
        if not students:
            tracks.append(
                TrackHealth(
                    course_id=course.id,
                    course_title=course.title,
                    enrolled=0,
                    active_last_7d=0,
                    avg_completion_pct=0.0,
                    avg_mastery=0.0,
                    high_risk_count=0,
                )
            )
            continue
        completions = []
        masteries = []
        active_count = 0
        high_risk = 0
        for s in students:
            metrics = quick_metrics(db, s.id)
            completions.append(metrics["completion_pct"])
            masteries.append(metrics["mastery_avg"])
            if metrics["days_since_active"] <= 7:
                active_count += 1
                active += 1
            onboarded += 1
            if metrics["completion_pct"] >= 0.5:
                completed_at_least_half += 1
            if metrics["mastery_avg"] >= 0.6:
                projected_ready += 1
            feats = build_at_risk_features(db, s.id)
            pred = at_risk_ai.predict(feats)
            if pred.risk_band == "high":
                high_risk += 1
        avg_c = sum(completions) / len(completions)
        avg_m = sum(masteries) / len(masteries)
        cohort_mastery_sum += sum(masteries)
        cohort_mastery_count += len(masteries)
        tracks.append(
            TrackHealth(
                course_id=course.id,
                course_title=course.title,
                enrolled=len(students),
                active_last_7d=active_count,
                avg_completion_pct=avg_c,
                avg_mastery=avg_m,
                high_risk_count=high_risk,
            )
        )

    avg_mastery_global = cohort_mastery_sum / cohort_mastery_count if cohort_mastery_count else 0.0
    funnel = [
        OutcomeFunnelStep(label="Onboarded", count=onboarded),
        OutcomeFunnelStep(label="Active 7d", count=active),
        OutcomeFunnelStep(label=">= 50% complete", count=completed_at_least_half),
        OutcomeFunnelStep(label="Projected role-ready", count=projected_ready),
    ]

    return AdminAnalyticsOut(
        total_learners=int(total_students),
        total_instructors=int(total_instructors),
        active_last_7d=int(active_last_7d),
        avg_mastery=avg_mastery_global,
        tracks=tracks,
        funnel=funnel,
    )
