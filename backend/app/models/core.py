"""All ORM tables for the Smart Adaptive LMS.

We co-locate models in one module because the schema is tightly coupled
and the file stays under ~250 lines, which is easier to navigate during
a 6-hour hackathon than fragmenting one class per file.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class UserRole(str, enum.Enum):
    student = "student"
    instructor = "instructor"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=32), default=UserRole.student, nullable=False
    )
    avatar_seed: Mapped[str] = mapped_column(String(64), default="atom", nullable=False)
    enrolled_course_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    weekly_hours: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    goal: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    prior_experience: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    language_pref: Mapped[str] = mapped_column(String(16), default="auto", nullable=False)
    onboarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    course: Mapped[Optional["Course"]] = relationship("Course", foreign_keys=[enrolled_course_id])
    dna: Mapped[Optional["LearningDNA"]] = relationship(
        "LearningDNA", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    attempts: Mapped[List["Attempt"]] = relationship(
        "Attempt", back_populates="user", cascade="all, delete-orphan"
    )
    masteries: Mapped[List["Mastery"]] = relationship(
        "Mastery", back_populates="user", cascade="all, delete-orphan"
    )
    events: Mapped[List["EngagementEvent"]] = relationship(
        "EngagementEvent", back_populates="user", cascade="all, delete-orphan"
    )
    roadmap_steps: Mapped[List["RoadmapStep"]] = relationship(
        "RoadmapStep", back_populates="user", cascade="all, delete-orphan",
        order_by="RoadmapStep.position",
    )
    reviews: Mapped[List["ReviewQueue"]] = relationship(
        "ReviewQueue", back_populates="user", cascade="all, delete-orphan"
    )
    tutor_messages: Mapped[List["TutorMessage"]] = relationship(
        "TutorMessage", back_populates="user", cascade="all, delete-orphan",
        order_by="TutorMessage.created_at",
    )


class LearningDNA(Base):
    """Five-dimensional cognitive fingerprint captured at onboarding."""

    __tablename__ = "learning_dna"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    modality: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    depth: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    pace: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    abstraction: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    time_of_day: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="dna")

    def as_vector(self) -> List[float]:
        return [self.modality, self.depth, self.pace, self.abstraction, self.time_of_day]

    def as_dict(self) -> dict:
        return {
            "modality": self.modality,
            "depth": self.depth,
            "pace": self.pace,
            "abstraction": self.abstraction,
            "time_of_day": self.time_of_day,
        }


class Course(Base):
    """An atomcamp track: bootcamp or program."""

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    tagline: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(String(16), default="#7c3aed", nullable=False)
    icon: Mapped[str] = mapped_column(String(32), default="GraduationCap", nullable=False)
    instructor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    modules: Mapped[List["Module"]] = relationship(
        "Module", back_populates="course", cascade="all, delete-orphan",
        order_by="Module.position",
    )


class Module(Base):
    __tablename__ = "modules"
    __table_args__ = (UniqueConstraint("course_id", "position"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(String(512), nullable=False)
    content_md: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    concepts: Mapped[List["Concept"]] = relationship(
        "Concept", back_populates="module", cascade="all, delete-orphan"
    )
    quiz_items: Mapped[List["QuizItem"]] = relationship(
        "QuizItem", back_populates="module", cascade="all, delete-orphan"
    )


class Concept(Base):
    """A discrete skill / knowledge component within a module."""

    __tablename__ = "concepts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(96), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(512), default="", nullable=False)

    module: Mapped["Module"] = relationship("Module", back_populates="concepts")
    out_edges: Mapped[List["ConceptEdge"]] = relationship(
        "ConceptEdge",
        foreign_keys="ConceptEdge.src_id",
        back_populates="src",
        cascade="all, delete-orphan",
    )
    in_edges: Mapped[List["ConceptEdge"]] = relationship(
        "ConceptEdge",
        foreign_keys="ConceptEdge.dst_id",
        back_populates="dst",
        cascade="all, delete-orphan",
    )


class ConceptEdge(Base):
    """Directed prerequisite edge: src is a prereq of dst."""

    __tablename__ = "concept_edges"
    __table_args__ = (UniqueConstraint("src_id", "dst_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    src_id: Mapped[int] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )
    dst_id: Mapped[int] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )

    src: Mapped["Concept"] = relationship(
        "Concept", foreign_keys=[src_id], back_populates="out_edges"
    )
    dst: Mapped["Concept"] = relationship(
        "Concept", foreign_keys=[dst_id], back_populates="in_edges"
    )


class QuizItem(Base):
    __tablename__ = "quiz_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True
    )
    concept_id: Mapped[int] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False)
    answer_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    difficulty: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    failure_mode: Mapped[str] = mapped_column(String(64), default="conceptual", nullable=False)

    module: Mapped["Module"] = relationship("Module", back_populates="quiz_items")
    concept: Mapped["Concept"] = relationship("Concept")


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quiz_item_id: Mapped[int] = mapped_column(
        ForeignKey("quiz_items.id", ondelete="CASCADE"), nullable=False
    )
    selected_index: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship("User", back_populates="attempts")
    quiz_item: Mapped["QuizItem"] = relationship("QuizItem")


class Mastery(Base):
    """Per-(user, concept) BKT mastery probability with last-review timestamp."""

    __tablename__ = "masteries"
    __table_args__ = (UniqueConstraint("user_id", "concept_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    concept_id: Mapped[int] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    p_mastery: Mapped[float] = mapped_column(Float, default=0.3, nullable=False)
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stability_days: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="masteries")
    concept: Mapped["Concept"] = relationship("Concept")


class EngagementEvent(Base):
    """All learner micro-events feed risk + burnout + confusion analytics."""

    __tablename__ = "engagement_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    module_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("modules.id", ondelete="SET NULL"), nullable=True
    )
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship("User", back_populates="events")


class RoadmapStep(Base):
    """Personalised, ordered learning plan produced by the roadmap generator."""

    __tablename__ = "roadmap_steps"
    __table_args__ = (UniqueConstraint("user_id", "position"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("modules.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    target_week: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, default="", nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="roadmap_steps")
    module: Mapped["Module"] = relationship("Module")


class ReviewQueue(Base):
    """FSRS-lite spaced-repetition due dates per (user, concept)."""

    __tablename__ = "review_queue"
    __table_args__ = (UniqueConstraint("user_id", "concept_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    concept_id: Mapped[int] = mapped_column(
        ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    interval_days: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    ease: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="reviews")
    concept: Mapped["Concept"] = relationship("Concept")


class TutorMessage(Base):
    """Persisted AI tutor conversation, used for context + burnout sentiment."""

    __tablename__ = "tutor_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    module_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("modules.id", ondelete="SET NULL"), nullable=True
    )
    language: Mapped[str] = mapped_column(String(16), default="en", nullable=False)
    citations: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, index=True
    )

    user: Mapped["User"] = relationship("User", back_populates="tutor_messages")


class JobRole(Base):
    """Pakistan tech-market role used by the Career Outcome Simulator."""

    __tablename__ = "job_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=False)
    required_concepts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    salary_pkr_min: Mapped[int] = mapped_column(Integer, default=60000, nullable=False)
    salary_pkr_max: Mapped[int] = mapped_column(Integer, default=180000, nullable=False)
    market_demand: Mapped[float] = mapped_column(Float, default=0.7, nullable=False)
