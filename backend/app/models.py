from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Mood = Literal["focused", "confused", "busy", "low-confidence", "energized"]
LanguagePreference = Literal["English", "Urdu", "Mixed"]


class CourseModule(BaseModel):
    id: str
    title: str
    program: str
    level: Literal["beginner", "intermediate", "advanced"]
    duration_minutes: int
    skills: list[str]
    outcomes: list[str]
    best_for: list[str]
    project_seed: str


class OnboardingRequest(BaseModel):
    name: str = Field(min_length=2)
    goal: str
    background: str
    weekly_hours: int = Field(ge=1, le=40)
    language: LanguagePreference = "Mixed"
    confidence: int = Field(ge=1, le=5)
    baseline_quiz: int = Field(ge=0, le=100)
    attendance_rate: int = Field(default=88, ge=0, le=100)
    activity_rate: int = Field(default=72, ge=0, le=100)
    motivation_style: str = "career progress"
    barriers: list[str] = Field(default_factory=list)
    weak_skills: list[str] = Field(default_factory=list)


class LearningTwin(BaseModel):
    id: str
    name: str
    goal: str
    background: str
    weekly_hours: int
    language: LanguagePreference
    confidence: int
    baseline_quiz: int
    attendance_rate: int
    activity_rate: int
    motivation_style: str
    barriers: list[str]
    weak_skills: list[str]
    primary_track: str
    risk_score: int
    risk_level: Literal["low", "medium", "high"]
    signature: str


class DailyPlan(BaseModel):
    title: str
    duration_minutes: int
    lesson: str
    micro_task: str
    confidence_check: str
    next_action: str
    capstone_path: str
    peer_pod: list[str]
    explanation: list[str]
    mode: Literal["accelerate", "steady", "repair", "support"]


class MoodCheckRequest(BaseModel):
    learner_id: str
    mood: Mood
    confidence: int = Field(ge=1, le=5)


class CoachRequest(BaseModel):
    learner_id: str
    question: str
    mood: Mood = "focused"


class CoachResponse(BaseModel):
    answer: str
    source: Literal["llm", "fallback"]
    recommended_next_step: str


class OnboardingResponse(BaseModel):
    twin: LearningTwin
    today: DailyPlan


class RiskCard(BaseModel):
    learner: str
    risk_score: int
    risk_level: Literal["low", "medium", "high"]
    reasons: list[str]
    nudge: str
    suggested_action: str


class InstructorDashboard(BaseModel):
    risk_cards: list[RiskCard]
    peer_pods: list[list[str]]
    focus_summary: str


class AdminInsights(BaseModel):
    cohort_health: str
    top_skill_gaps: list[str]
    content_opportunities: list[str]
    demand_signals: list[str]
    recommended_experiments: list[str]

