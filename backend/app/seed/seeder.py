"""Idempotent seeder: courses, users, attempts, engagement history."""

from __future__ import annotations

import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from sqlalchemy.orm import Session

from ..auth import hash_password
from ..models import (
    Attempt,
    Concept,
    ConceptEdge,
    Course,
    EngagementEvent,
    JobRole,
    LearningDNA,
    Mastery,
    Module,
    QuizItem,
    ReviewQueue,
    RoadmapStep,
    TutorMessage,
    User,
    UserRole,
)
from ..services.mastery import apply_response
from .content import courses_catalog, job_roles_catalog

_log = logging.getLogger(__name__)


def has_data(db: Session) -> bool:
    return db.query(User).count() > 0


def seed_all(db: Session, *, force: bool = False) -> Dict[str, int]:
    if has_data(db) and not force:
        _log.info("Database already seeded; skipping (use force=True to re-seed)")
        return {"skipped": 1}

    stats: Dict[str, int] = {}
    instructor, admin = _seed_staff(db)
    db.flush()

    course_map = _seed_courses(db, instructor.id)
    stats["courses"] = len(course_map)
    db.flush()

    _seed_job_roles(db)
    db.flush()

    students = _seed_students(db, course_map)
    stats["students"] = len(students)
    db.flush()

    _simulate_history(db, students, course_map)
    db.commit()
    _log.info("Seeded: %s", stats)
    return stats


def _seed_staff(db: Session) -> Tuple[User, User]:
    instructor = _ensure_user(
        db,
        email="instructor@atomcamp.dev",
        full_name="Hira Khan",
        password="instructor123",
        role=UserRole.instructor,
        avatar_seed="hira",
    )
    admin = _ensure_user(
        db,
        email="admin@atomcamp.dev",
        full_name="Atomcamp Admin",
        password="admin123",
        role=UserRole.admin,
        avatar_seed="atom",
    )
    return instructor, admin


def _ensure_user(
    db: Session,
    *,
    email: str,
    full_name: str,
    password: str,
    role: UserRole,
    avatar_seed: str,
    **kwargs,
) -> User:
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing:
        return existing
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=role,
        avatar_seed=avatar_seed,
        **kwargs,
    )
    db.add(user)
    db.flush()
    return user


def _seed_courses(db: Session, instructor_id: int) -> Dict[str, Course]:
    course_map: Dict[str, Course] = {}
    for cdata in courses_catalog():
        course = Course(
            slug=cdata["slug"],
            title=cdata["title"],
            tagline=cdata["tagline"],
            description=cdata["description"],
            color=cdata["color"],
            icon=cdata["icon"],
            instructor_id=instructor_id,
        )
        db.add(course)
        db.flush()
        course_map[course.slug] = course

        concept_by_slug: Dict[str, Concept] = {}
        for pos, mdata in enumerate(cdata["modules"], start=1):
            module = Module(
                course_id=course.id,
                slug=mdata["slug"],
                title=mdata["title"],
                summary=mdata["summary"],
                content_md=mdata["content_md"],
                estimated_minutes=mdata.get("estimated_minutes", 30),
                position=pos,
            )
            db.add(module)
            db.flush()

            for con in mdata.get("concepts", []):
                concept = Concept(
                    module_id=module.id,
                    slug=con["slug"],
                    name=con["name"],
                    description=con.get("description", ""),
                )
                db.add(concept)
                db.flush()
                concept_by_slug[con["slug"]] = concept

            for q in mdata.get("quiz_items", []):
                concept_slug = q["concept"]
                concept = concept_by_slug.get(concept_slug)
                if concept is None:
                    continue
                item = QuizItem(
                    module_id=module.id,
                    concept_id=concept.id,
                    prompt=q["prompt"],
                    options=q["options"],
                    answer_index=q["answer"],
                    explanation=q.get("explanation", ""),
                    difficulty=q.get("difficulty", 0.5),
                    failure_mode=q.get("failure_mode", "conceptual"),
                )
                db.add(item)

        # Wire prereq edges after all concepts exist for this course
        for mdata in cdata["modules"]:
            for con in mdata.get("concepts", []):
                dst = concept_by_slug.get(con["slug"])
                if not dst:
                    continue
                for prereq_slug in con.get("prereqs", []):
                    src = concept_by_slug.get(prereq_slug)
                    if src and src.id != dst.id:
                        db.add(ConceptEdge(src_id=src.id, dst_id=dst.id))
    return course_map


def _seed_job_roles(db: Session) -> None:
    for r in job_roles_catalog():
        existing = db.query(JobRole).filter(JobRole.slug == r["slug"]).one_or_none()
        if existing:
            continue
        db.add(JobRole(**r))


STUDENT_BLUEPRINTS = [
    # (full_name, email, course_slug, dna, weekly_hours, profile)
    ("Aliya Tariq", "aliya@atomcamp.dev", "data-science-ai", (0.7, 0.6, 0.7, 0.6, 0.7), 8, "strong"),
    ("Bilal Shah", "bilal@atomcamp.dev", "data-science-ai", (0.4, 0.7, 0.4, 0.5, 0.4), 6, "struggling"),
    ("Maryam Iqbal", "maryam@atomcamp.dev", "data-science-ai", (0.6, 0.5, 0.5, 0.5, 0.6), 5, "average"),
    ("Hassan Ali", "hassan@atomcamp.dev", "data-science-ai", (0.5, 0.4, 0.6, 0.6, 0.4), 7, "burnout"),
    ("Sana Mehmood", "sana@atomcamp.dev", "data-science-ai", (0.8, 0.7, 0.6, 0.7, 0.7), 9, "strong"),
    ("Ayesha Raza", "ayesha@atomcamp.dev", "generative-ai", (0.7, 0.6, 0.6, 0.7, 0.6), 7, "strong"),
    ("Omer Farooq", "omer@atomcamp.dev", "generative-ai", (0.5, 0.5, 0.4, 0.5, 0.4), 4, "struggling"),
    ("Zainab Saeed", "zainab@atomcamp.dev", "generative-ai", (0.6, 0.6, 0.5, 0.6, 0.5), 6, "average"),
    ("Imran Yousaf", "imran@atomcamp.dev", "generative-ai", (0.4, 0.4, 0.4, 0.5, 0.4), 3, "at-risk"),
    ("Rabia Anwar", "rabia@atomcamp.dev", "full-stack", (0.6, 0.5, 0.7, 0.5, 0.6), 8, "strong"),
    ("Talha Ahmed", "talha@atomcamp.dev", "full-stack", (0.5, 0.5, 0.5, 0.5, 0.5), 5, "average"),
    ("Hina Naseer", "hina@atomcamp.dev", "full-stack", (0.4, 0.6, 0.4, 0.5, 0.4), 4, "struggling"),
    ("Usman Riaz", "usman@atomcamp.dev", "digital-marketing", (0.7, 0.5, 0.7, 0.6, 0.7), 6, "strong"),
    ("Mehwish Asif", "mehwish@atomcamp.dev", "digital-marketing", (0.5, 0.5, 0.5, 0.5, 0.5), 5, "average"),
    ("Salman Akhtar", "salman@atomcamp.dev", "digital-marketing", (0.4, 0.5, 0.4, 0.5, 0.4), 3, "at-risk"),
]


# Hero demo student that judges sign in as - placed first for visibility.
DEMO_STUDENT = ("Saram Aslam", "student@atomcamp.dev", "data-science-ai", (0.7, 0.6, 0.6, 0.6, 0.6), 6, "average")


def _seed_students(db: Session, course_map: Dict[str, Course]) -> List[User]:
    blueprints = [DEMO_STUDENT, *STUDENT_BLUEPRINTS]
    users: List[User] = []
    for blueprint in blueprints:
        name, email, course_slug, dna_tuple, hours, _profile_key = blueprint
        course = course_map.get(course_slug)
        password = "student123" if email == "student@atomcamp.dev" else "demo123"
        user = _ensure_user(
            db,
            email=email,
            full_name=name,
            password=password,
            role=UserRole.student,
            avatar_seed=email.split("@", 1)[0],
            enrolled_course_id=course.id if course else None,
            weekly_hours=hours,
            goal="Become job-ready",
            prior_experience="beginner",
            language_pref="auto",
            onboarded_at=datetime.utcnow() - timedelta(days=21),
        )
        modality, depth, pace, abstraction, time_of_day = dna_tuple
        dna = db.query(LearningDNA).filter(LearningDNA.user_id == user.id).one_or_none()
        if dna is None:
            dna = LearningDNA(
                user_id=user.id,
                modality=modality,
                depth=depth,
                pace=pace,
                abstraction=abstraction,
                time_of_day=time_of_day,
            )
            db.add(dna)
        users.append(user)
    return users


def _profile_correctness(profile: str) -> float:
    return {
        "strong": 0.85,
        "average": 0.65,
        "struggling": 0.45,
        "burnout": 0.55,
        "at-risk": 0.30,
    }.get(profile, 0.6)


def _simulate_history(db: Session, students: List[User], course_map: Dict[str, Course]) -> None:
    rng = random.Random(20260513)
    now = datetime.utcnow()

    blueprint_lookup = {bp[1]: bp for bp in [DEMO_STUDENT, *STUDENT_BLUEPRINTS]}

    for user in students:
        bp = blueprint_lookup.get(user.email)
        profile = bp[6] if bp else "average"
        correctness = _profile_correctness(profile)
        weekly = user.weekly_hours or 4

        course = user.course
        if course is None:
            continue
        modules = sorted(course.modules, key=lambda m: m.position)
        if not modules:
            continue

        if profile == "strong":
            depth_modules = modules[: max(2, len(modules) - 1)]
        elif profile in ("average",):
            depth_modules = modules[: max(2, len(modules) // 2 + 1)]
        elif profile in ("struggling", "burnout"):
            depth_modules = modules[: max(1, len(modules) // 2)]
        else:
            depth_modules = modules[:1]

        for idx, module in enumerate(depth_modules):
            target_week = (idx // max(1, weekly // 4)) + 1
            db.add(
                RoadmapStep(
                    user_id=user.id,
                    module_id=module.id,
                    position=idx + 1,
                    target_week=target_week,
                    rationale="Seeded roadmap step",
                    completed=idx < len(depth_modules) - 1,
                )
            )

            for qi in module.quiz_items:
                base = correctness - (qi.difficulty - 0.4) * 0.4
                p_correct = max(0.05, min(0.95, base))
                correct = rng.random() < p_correct
                selected = qi.answer_index if correct else (qi.answer_index + 1) % len(qi.options)
                seconds = rng.uniform(12, 95)
                retries = 1 if not correct and rng.random() < 0.4 else 0
                attempt = Attempt(
                    user_id=user.id,
                    quiz_item_id=qi.id,
                    selected_index=selected,
                    correct=correct,
                    seconds=seconds,
                    retries=retries,
                    created_at=now - timedelta(days=rng.randint(1, 20)),
                )
                db.add(attempt)
                db.flush()
                apply_response(db, user.id, qi.concept_id, correct)

        # Engagement events: weekly time, sessions, occasional confusion
        for d in range(0, 21):
            ts = now - timedelta(days=d)
            if profile == "burnout" and d <= 6:
                seconds = rng.uniform(0, 600)
            elif profile == "at-risk":
                seconds = rng.uniform(0, 900)
            elif profile == "strong":
                seconds = rng.uniform(1500, 3600)
            else:
                seconds = rng.uniform(800, 2200)
            db.add(
                EngagementEvent(
                    user_id=user.id,
                    kind="time",
                    payload={"seconds": seconds},
                    created_at=ts,
                )
            )

        for _ in range(rng.randint(2, 6)):
            db.add(
                EngagementEvent(
                    user_id=user.id,
                    kind="session",
                    payload={"minutes": rng.uniform(15, 75 if profile != "burnout" else 110)},
                    created_at=now - timedelta(days=rng.randint(1, 14)),
                )
            )

        confusion_count = {"strong": 1, "average": 2, "struggling": 5, "burnout": 4, "at-risk": 6}.get(profile, 2)
        for _ in range(confusion_count):
            db.add(
                EngagementEvent(
                    user_id=user.id,
                    kind="confusion",
                    payload={"seconds": rng.uniform(120, 240)},
                    created_at=now - timedelta(days=rng.randint(1, 14)),
                )
            )

        # Seed a few tutor questions per student
        sample_questions_en = [
            "Can you explain the difference between precision and recall?",
            "I'm stuck on groupby - which axis is being collapsed?",
            "Why is my model overfitting after epoch 3?",
        ]
        sample_questions_ru = [
            "yaar logistic regression aur linear regression me kya farq hai?",
            "react useEffect baar baar chal raha hai, kese theek karu?",
            "main thak gaya hun, ye material samajh nahi a rahi",
        ]
        if profile == "burnout":
            samples = sample_questions_ru
            lang = "roman_ur"
        elif profile in ("struggling", "at-risk"):
            samples = sample_questions_ru[:1] + sample_questions_en[:1]
            lang = "roman_ur"
        else:
            samples = sample_questions_en
            lang = "en"
        for q in samples[: 2 if profile != "burnout" else 3]:
            db.add(
                TutorMessage(
                    user_id=user.id,
                    role="user",
                    content=q,
                    module_id=modules[0].id,
                    language=lang,
                    citations=[],
                    created_at=now - timedelta(days=rng.randint(1, 12)),
                )
            )
