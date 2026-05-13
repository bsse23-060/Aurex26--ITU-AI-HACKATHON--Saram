from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DNAVector(BaseModel):
    modality: float = Field(ge=0.0, le=1.0)
    depth: float = Field(ge=0.0, le=1.0)
    pace: float = Field(ge=0.0, le=1.0)
    abstraction: float = Field(ge=0.0, le=1.0)
    time_of_day: float = Field(ge=0.0, le=1.0)


class DiagnosticAnswer(BaseModel):
    concept_slug: str
    correct: bool


class OnboardingRequest(BaseModel):
    course_id: int
    goal: str = Field(min_length=2, max_length=255)
    prior_experience: str = Field(default="beginner")
    weekly_hours: int = Field(ge=1, le=80, default=5)
    language_pref: str = Field(default="auto")
    dna: DNAVector
    diagnostic: List[DiagnosticAnswer] = []


class MasteryOut(BaseModel):
    concept_id: int
    concept_slug: str
    concept_name: str
    module_id: int
    p_mastery: float
    last_seen: Optional[str] = None


class RoadmapStepOut(BaseModel):
    position: int
    module_id: int
    module_title: str
    module_summary: str
    target_week: int
    rationale: str
    completed: bool
    estimated_minutes: int


class RoadmapOut(BaseModel):
    course_id: int
    course_title: str
    course_color: str
    steps: List[RoadmapStepOut]
    generated_by: str  # "gemini" | "rules"


class RecommendationOut(BaseModel):
    module_id: int
    module_title: str
    reason: str
    score: float


class PeerTwinOut(BaseModel):
    twin_id: int
    twin_name: str
    avatar_seed: str
    modules_ahead: int
    similarity: float
    shared_strengths: List[str]
    note: str


class CareerSkillGap(BaseModel):
    concept_slug: str
    concept_name: str
    current: float
    required: float


class CareerProjection(BaseModel):
    horizon_weeks: int
    projected_mastery_avg: float
    label: str


class CareerRoleMatch(BaseModel):
    role_slug: str
    role_title: str
    description: str
    match_pct: float
    weeks_to_ready: Optional[int] = None
    salary_pkr_min: int
    salary_pkr_max: int
    market_demand: float
    skill_gaps: List[CareerSkillGap]


class CareerOut(BaseModel):
    current_mastery_avg: float
    weekly_hours: int
    projections: List[CareerProjection]
    roles: List[CareerRoleMatch]
