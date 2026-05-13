from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel


class RiskReason(BaseModel):
    feature: str
    label: str
    contribution: float


class AtRiskStudentOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    avatar_seed: str
    course_id: Optional[int]
    course_title: Optional[str]
    risk_prob: float
    risk_band: str  # low | medium | high
    burnout_flag: bool
    mastery_avg: float
    days_since_active: int
    completion_pct: float
    top_reasons: List[RiskReason]


class BurnoutFlagOut(BaseModel):
    user_id: int
    full_name: str
    signal_strength: float
    indicators: List[str]


class InstructorDashboardOut(BaseModel):
    instructor_id: int
    course_id: Optional[int]
    course_title: Optional[str]
    total_students: int
    active_last_7d: int
    avg_completion_pct: float
    avg_mastery: float
    high_risk_count: int
    burnout_count: int
    students: List[AtRiskStudentOut]


class ConceptMasteryAgg(BaseModel):
    concept_id: int
    concept_name: str
    module_id: int
    module_title: str
    avg_mastery: float
    learners_struggling: int


class FailureModeAgg(BaseModel):
    failure_mode: str
    count: int


class HardestItem(BaseModel):
    quiz_item_id: int
    module_title: str
    concept_name: str
    prompt: str
    accuracy: float


class CourseAnalyticsOut(BaseModel):
    course_id: int
    course_title: str
    concept_mastery: List[ConceptMasteryAgg]
    failure_modes: List[FailureModeAgg]
    hardest_items: List[HardestItem]


class StudentDetailOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    avatar_seed: str
    role: str
    course_id: Optional[int]
    course_title: Optional[str]
    dna: Optional[Dict[str, float]] = None
    weekly_hours: int
    goal: Optional[str]
    mastery_avg: float
    completion_pct: float
    risk_prob: float
    burnout_flag: bool
    top_reasons: List[RiskReason]
    recent_attempts: int
    recent_tutor_questions: int
    concept_mastery: List[ConceptMasteryAgg]
    confusion_incidents: int


class TrackHealth(BaseModel):
    course_id: int
    course_title: str
    enrolled: int
    active_last_7d: int
    avg_completion_pct: float
    avg_mastery: float
    high_risk_count: int


class OutcomeFunnelStep(BaseModel):
    label: str
    count: int


class AdminAnalyticsOut(BaseModel):
    total_learners: int
    total_instructors: int
    active_last_7d: int
    avg_mastery: float
    tracks: List[TrackHealth]
    funnel: List[OutcomeFunnelStep]
