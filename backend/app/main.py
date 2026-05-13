from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .adaptive_engine import (
    admin_insights,
    build_today_raasta,
    create_twin,
    fallback_coach_answer,
    instructor_dashboard,
)
from .data import COURSE_CATALOG, DEMO_LEARNERS
from .dataset_loader import load_external_profiles
from .llm import generate_personal_response
from .models import (
    AdminInsights,
    CoachRequest,
    CoachResponse,
    CourseModule,
    InstructorDashboard,
    LearningTwin,
    MoodCheckRequest,
    OnboardingRequest,
    OnboardingResponse,
)


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

app = FastAPI(
    title="RaastaAI API",
    description="Personal Learning Twin and adaptive LMS prototype for atomcamp.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

external_profiles = load_external_profiles()
seed_profiles = [*DEMO_LEARNERS, *external_profiles]
seed_ids: set[str] = set()
profiles: dict[str, OnboardingRequest] = {}
twins: dict[str, LearningTwin] = {}

for demo in seed_profiles:
    twin = create_twin(demo)
    profiles[twin.id] = demo
    twins[twin.id] = twin
    seed_ids.add(twin.id)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "product": "RaastaAI"}


@app.get("/api/courses", response_model=list[CourseModule])
def courses() -> list[CourseModule]:
    return COURSE_CATALOG


@app.get("/api/demo", response_model=list[OnboardingResponse])
def demo_learners() -> list[OnboardingResponse]:
    return [
        OnboardingResponse(twin=create_twin(profile), today=build_today_raasta(profile))
        for profile in DEMO_LEARNERS[:2]
    ]


@app.post("/api/onboarding", response_model=OnboardingResponse)
def onboard(profile: OnboardingRequest) -> OnboardingResponse:
    twin = create_twin(profile)
    profiles[twin.id] = profile
    twins[twin.id] = twin
    return OnboardingResponse(twin=twin, today=build_today_raasta(profile))


@app.get("/api/learners/{learner_id}/path")
def learner_path(learner_id: str, mood: str = "focused", confidence: int | None = None) -> dict:
    profile = profiles.get(learner_id)
    twin = twins.get(learner_id)
    if not profile or not twin:
        raise HTTPException(status_code=404, detail="Learner not found")
    return {"twin": twin, "today": build_today_raasta(profile, mood=mood, confidence=confidence)}


@app.post("/api/checkin")
def checkin(request: MoodCheckRequest) -> dict:
    profile = profiles.get(request.learner_id)
    twin = twins.get(request.learner_id)
    if not profile or not twin:
        raise HTTPException(status_code=404, detail="Learner not found")
    updated_profile = profile.model_copy(update={"confidence": request.confidence})
    profiles[request.learner_id] = updated_profile
    updated_twin = create_twin(updated_profile).model_copy(update={"id": request.learner_id})
    twins[request.learner_id] = updated_twin
    return {
        "twin": updated_twin,
        "today": build_today_raasta(updated_profile, mood=request.mood, confidence=request.confidence),
    }


@app.post("/api/coach", response_model=CoachResponse)
async def coach(request: CoachRequest) -> CoachResponse:
    profile = profiles.get(request.learner_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Learner not found")

    fallback, next_step = fallback_coach_answer(profile, request.question, request.mood)
    prompt = (
        f"Learner: {profile.name}\n"
        f"Goal: {profile.goal}\n"
        f"Background: {profile.background}\n"
        f"Weekly hours: {profile.weekly_hours}\n"
        f"Language preference: {profile.language}\n"
        f"Confidence: {profile.confidence}/5\n"
        f"Weak skills: {', '.join(profile.weak_skills) or 'not specified'}\n"
        f"Mood: {request.mood}\n"
        f"Question: {request.question}\n"
        "Give a short personal learning answer and one practical next step."
    )
    generated = await generate_personal_response(prompt)
    if generated:
        return CoachResponse(answer=generated, source="llm", recommended_next_step=next_step)
    return CoachResponse(answer=fallback, source="fallback", recommended_next_step=next_step)


@app.get("/api/instructor/risk", response_model=InstructorDashboard)
def instructor() -> InstructorDashboard:
    custom = [profile for learner_id, profile in profiles.items() if learner_id not in seed_ids]
    return instructor_dashboard(custom)


@app.get("/api/admin/insights", response_model=AdminInsights)
def admin() -> AdminInsights:
    custom = [profile for learner_id, profile in profiles.items() if learner_id not in seed_ids]
    return admin_insights(custom)
