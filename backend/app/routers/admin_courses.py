"""Admin course catalogue management (CRUD for courses + modules).

These endpoints let an admin add new tracks to atomcamp on the fly. They are
admin-only; instructors can read but not write so they don't accidentally
rewrite a track. Concepts can be created as part of a module so the skill
graph and adaptive quizzes still work for the new content.
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session, selectinload

from ..auth import require_admin
from ..database import get_db
from ..models import Concept, Course, Module, User
from ..schemas.courses import CourseOut, ModuleOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/courses", tags=["admin-courses"])


# ---------------------------------------------------------------------------
# Pydantic schemas (kept local: this is the only place that consumes them)
# ---------------------------------------------------------------------------


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(text: str) -> str:
    base = _SLUG_RE.sub("-", text.lower()).strip("-")
    return base or "course"


class ConceptIn(BaseModel):
    slug: Optional[str] = None
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class ModuleIn(BaseModel):
    slug: Optional[str] = None
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=400)
    content_md: str = ""
    estimated_minutes: int = Field(default=30, ge=5, le=600)
    concepts: List[ConceptIn] = []


class ModulePatch(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content_md: Optional[str] = None
    estimated_minutes: Optional[int] = Field(default=None, ge=5, le=600)
    position: Optional[int] = Field(default=None, ge=1, le=999)


class CourseIn(BaseModel):
    slug: Optional[str] = None
    title: str = Field(min_length=1, max_length=160)
    tagline: str = Field(min_length=1, max_length=240)
    description: str = Field(min_length=1)
    color: str = "#0F766E"
    icon: str = "GraduationCap"
    instructor_id: Optional[int] = None
    modules: List[ModuleIn] = []


class CoursePatch(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    instructor_id: Optional[int] = None


class AdminCourseSummary(BaseModel):
    """Lightweight listing used by the admin UI table."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    tagline: str
    color: str
    icon: str
    instructor_id: Optional[int] = None
    module_count: int = 0
    concept_count: int = 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _unique_course_slug(db: Session, desired: str, ignore_id: Optional[int] = None) -> str:
    base = _slugify(desired) or "course"
    slug = base
    n = 2
    while True:
        q = db.query(Course).filter(Course.slug == slug)
        if ignore_id is not None:
            q = q.filter(Course.id != ignore_id)
        if not q.first():
            return slug
        slug = f"{base}-{n}"
        n += 1


def _unique_concept_slug(db: Session, desired: str, ignore_id: Optional[int] = None) -> str:
    base = _slugify(desired) or "concept"
    slug = base
    n = 2
    while True:
        q = db.query(Concept).filter(Concept.slug == slug)
        if ignore_id is not None:
            q = q.filter(Concept.id != ignore_id)
        if not q.first():
            return slug
        slug = f"{base}-{n}"
        n += 1


def _next_module_position(db: Session, course_id: int) -> int:
    last = (
        db.query(Module.position)
        .filter(Module.course_id == course_id)
        .order_by(Module.position.desc())
        .first()
    )
    return (last[0] + 1) if last else 1


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=List[AdminCourseSummary])
def list_courses(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> List[AdminCourseSummary]:
    rows = (
        db.query(Course)
        .options(selectinload(Course.modules).selectinload(Module.concepts))
        .order_by(Course.title)
        .all()
    )
    return [
        AdminCourseSummary(
            id=c.id,
            slug=c.slug,
            title=c.title,
            tagline=c.tagline,
            color=c.color,
            icon=c.icon,
            instructor_id=c.instructor_id,
            module_count=len(c.modules),
            concept_count=sum(len(m.concepts) for m in c.modules),
        )
        for c in rows
    ]


@router.get("/{course_id}", response_model=CourseOut)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> CourseOut:
    course = (
        db.query(Course)
        .options(selectinload(Course.modules))
        .filter(Course.id == course_id)
        .one_or_none()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseOut.model_validate(course)


@router.post("", response_model=CourseOut, status_code=201)
def create_course(
    payload: CourseIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> CourseOut:
    slug = _unique_course_slug(db, payload.slug or payload.title)
    course = Course(
        slug=slug,
        title=payload.title,
        tagline=payload.tagline,
        description=payload.description,
        color=payload.color,
        icon=payload.icon,
        instructor_id=payload.instructor_id,
    )
    db.add(course)
    db.flush()

    for idx, mod in enumerate(payload.modules, start=1):
        module = Module(
            course_id=course.id,
            slug=_slugify(mod.slug or f"{slug}-{mod.title}-{idx}"),
            title=mod.title,
            summary=mod.summary,
            content_md=mod.content_md or f"# {mod.title}\n\n{mod.summary}",
            estimated_minutes=mod.estimated_minutes,
            position=idx,
        )
        db.add(module)
        db.flush()
        for con in mod.concepts:
            db.add(
                Concept(
                    module_id=module.id,
                    slug=_unique_concept_slug(db, con.slug or f"{slug}-{con.name}"),
                    name=con.name,
                    description=con.description,
                )
            )

    db.commit()
    db.refresh(course)
    course = (
        db.query(Course)
        .options(selectinload(Course.modules))
        .filter(Course.id == course.id)
        .one()
    )
    return CourseOut.model_validate(course)


@router.patch("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    payload: CoursePatch,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> CourseOut:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for field in ("title", "tagline", "description", "color", "icon", "instructor_id"):
        value = getattr(payload, field)
        if value is not None:
            setattr(course, field, value)
    db.commit()
    course = (
        db.query(Course)
        .options(selectinload(Course.modules))
        .filter(Course.id == course.id)
        .one()
    )
    return CourseOut.model_validate(course)


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return None


# ----- Modules --------------------------------------------------------------


@router.post("/{course_id}/modules", response_model=ModuleOut, status_code=201)
def add_module(
    course_id: int,
    payload: ModuleIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ModuleOut:
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    position = _next_module_position(db, course.id)
    module = Module(
        course_id=course.id,
        slug=_slugify(payload.slug or f"{course.slug}-{payload.title}-{position}"),
        title=payload.title,
        summary=payload.summary,
        content_md=payload.content_md or f"# {payload.title}\n\n{payload.summary}",
        estimated_minutes=payload.estimated_minutes,
        position=position,
    )
    db.add(module)
    db.flush()
    for con in payload.concepts:
        db.add(
            Concept(
                module_id=module.id,
                slug=_unique_concept_slug(db, con.slug or f"{course.slug}-{con.name}"),
                name=con.name,
                description=con.description,
            )
        )
    db.commit()
    db.refresh(module)
    return ModuleOut.model_validate(module)


@router.patch("/modules/{module_id}", response_model=ModuleOut)
def update_module(
    module_id: int,
    payload: ModulePatch,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> ModuleOut:
    module = db.get(Module, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    for field in ("title", "summary", "content_md", "estimated_minutes", "position"):
        value = getattr(payload, field)
        if value is not None:
            setattr(module, field, value)
    db.commit()
    db.refresh(module)
    return ModuleOut.model_validate(module)


@router.delete("/modules/{module_id}", status_code=204)
def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    module = db.get(Module, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()
    return None
