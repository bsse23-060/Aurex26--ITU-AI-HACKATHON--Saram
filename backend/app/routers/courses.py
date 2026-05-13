"""Course catalogue endpoints (public)."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Course, Module
from ..schemas.courses import CourseOut, ModuleOut

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=List[CourseOut])
def list_courses(db: Session = Depends(get_db)) -> List[CourseOut]:
    rows = (
        db.query(Course)
        .options(selectinload(Course.modules))
        .order_by(Course.title)
        .all()
    )
    return [CourseOut.model_validate(c) for c in rows]


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)) -> CourseOut:
    row = (
        db.query(Course)
        .options(selectinload(Course.modules))
        .filter(Course.id == course_id)
        .one_or_none()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseOut.model_validate(row)
