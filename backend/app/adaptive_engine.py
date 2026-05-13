from __future__ import annotations

import hashlib
import math
import re
from collections import Counter

from .data import COURSE_CATALOG, DEMO_LEARNERS
from .models import (
    AdminInsights,
    DailyPlan,
    InstructorDashboard,
    LearningTwin,
    OnboardingRequest,
    RiskCard,
)


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _slug(text: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:6]
    return f"{base}-{digest}"


def _risk_level(score: int) -> str:
    if score >= 68:
        return "high"
    if score >= 42:
        return "medium"
    return "low"


def score_risk(profile: OnboardingRequest) -> tuple[int, list[str]]:
    reasons: list[str] = []
    raw = 0.0

    quiz_gap = max(0, 70 - profile.baseline_quiz) / 70
    raw += quiz_gap * 28
    if profile.baseline_quiz < 55:
        reasons.append("baseline quiz suggests foundation gaps")

    attendance_gap = max(0, 85 - profile.attendance_rate) / 85
    raw += attendance_gap * 20
    if profile.attendance_rate < 80:
        reasons.append("attendance pattern may slow momentum")

    activity_gap = max(0, 75 - profile.activity_rate) / 75
    raw += activity_gap * 22
    if profile.activity_rate < 60:
        reasons.append("recent activity is below cohort rhythm")

    confidence_gap = max(0, 4 - profile.confidence) / 4
    raw += confidence_gap * 18
    if profile.confidence <= 2:
        reasons.append("low confidence needs a smaller first step")

    time_gap = max(0, 6 - profile.weekly_hours) / 6
    raw += time_gap * 12
    if profile.weekly_hours <= 4:
        reasons.append("limited weekly hours require micro-learning")

    if len(profile.barriers) >= 2:
        raw += 6
        reasons.append("multiple barriers should be handled explicitly")

    score = min(95, max(5, round(raw)))
    if not reasons:
        reasons.append("learner is currently on track")
    return score, reasons


def recommend_course(profile: OnboardingRequest):
    goal_tokens = _tokens(profile.goal + " " + profile.background)
    weak_tokens = set(skill.lower() for skill in profile.weak_skills)
    best = None
    best_score = -1.0

    for course in COURSE_CATALOG:
        course_tokens = _tokens(
            " ".join([course.title, course.program, *course.skills, *course.best_for, *course.outcomes])
        )
        goal_overlap = len(goal_tokens & course_tokens) * 3
        weak_overlap = len(weak_tokens & set(course.skills)) * 5
        level_fit = 2 if course.level == "beginner" and profile.confidence <= 3 else 0
        time_fit = 2 if course.duration_minutes <= max(30, profile.weekly_hours * 10) else -1
        score = goal_overlap + weak_overlap + level_fit + time_fit
        if score > best_score:
            best_score = score
            best = course

    return best or COURSE_CATALOG[0]


def create_twin(profile: OnboardingRequest) -> LearningTwin:
    course = recommend_course(profile)
    risk, _ = score_risk(profile)
    signature = (
        f"{profile.name} learns best through {profile.motivation_style}, "
        f"{profile.language.lower()} support, and visible progress toward: {profile.goal}."
    )
    return LearningTwin(
        id=_slug(profile.name + profile.goal),
        name=profile.name,
        goal=profile.goal,
        background=profile.background,
        weekly_hours=profile.weekly_hours,
        language=profile.language,
        confidence=profile.confidence,
        baseline_quiz=profile.baseline_quiz,
        attendance_rate=profile.attendance_rate,
        activity_rate=profile.activity_rate,
        motivation_style=profile.motivation_style,
        barriers=profile.barriers,
        weak_skills=profile.weak_skills,
        primary_track=course.title,
        risk_score=risk,
        risk_level=_risk_level(risk),
        signature=signature,
    )


def build_today_raasta(profile: OnboardingRequest, mood: str = "focused", confidence: int | None = None) -> DailyPlan:
    confidence_now = confidence if confidence is not None else profile.confidence
    course = recommend_course(profile)
    weak_skill = profile.weak_skills[0] if profile.weak_skills else course.skills[0]
    peer_pod = match_peer_pod(profile)

    if mood in {"confused", "low-confidence"} or confidence_now <= 2:
        mode = "repair"
        duration = min(35, course.duration_minutes)
        lesson = f"Rebuild one concept: {weak_skill} inside {course.title}"
        micro_task = f"Complete a 12-minute guided practice and write one question for your mentor about {weak_skill}."
        next_action = "Book a quick instructor check-in or join the peer pod before attempting the next lesson."
    elif mood == "busy" or profile.weekly_hours <= 4:
        mode = "support"
        duration = min(30, course.duration_minutes)
        lesson = f"Micro-sprint: one practical idea from {course.title}"
        micro_task = f"Ship a tiny workplace artifact connected to {course.project_seed}."
        next_action = "Save the next lesson for tomorrow and keep the streak alive with a small proof of work."
    elif confidence_now >= 4 and profile.baseline_quiz >= 70:
        mode = "accelerate"
        duration = min(60, course.duration_minutes + 10)
        lesson = f"Stretch lesson: apply {course.skills[-1]} in {course.title}"
        micro_task = f"Add one advanced feature to your capstone: {course.project_seed}."
        next_action = "Ask for feedback from a stronger peer and prepare a short portfolio note."
    else:
        mode = "steady"
        duration = min(50, course.duration_minutes)
        lesson = f"Core lesson: {course.title} for {profile.goal}"
        micro_task = f"Create one portfolio artifact based on {course.project_seed}."
        next_action = "Take a 3-question confidence check and unlock tomorrow's route."

    capstone = career_capstone(profile, course.project_seed)
    explanation = [
        f"Skill gap: focused on {weak_skill} because it appears in the learner twin.",
        f"Goal fit: {course.title} maps directly to '{profile.goal}'.",
        f"Confidence signal: current confidence {confidence_now}/5 sets the route to {mode}.",
        f"Time constraint: {profile.weekly_hours} weekly hours keeps today's path near {duration} minutes.",
    ]

    return DailyPlan(
        title="Today's Raasta",
        duration_minutes=duration,
        lesson=lesson,
        micro_task=micro_task,
        confidence_check="After the task, rate confidence from 1-5 and write the blocker in one sentence.",
        next_action=next_action,
        capstone_path=capstone,
        peer_pod=peer_pod,
        explanation=explanation,
        mode=mode,
    )


def career_capstone(profile: OnboardingRequest, project_seed: str) -> str:
    goal = profile.goal.lower()
    if "data" in goal or "analyst" in goal:
        return "Portfolio capstone: a Pakistan retail sales dashboard with insight narration and interview talking points."
    if "agent" in goal or "automation" in goal or "office" in goal:
        return "Portfolio capstone: an AI office assistant that drafts reports, summarizes sheets, and suggests follow-ups."
    if "python" in goal:
        return "Portfolio capstone: a Python mini-tool that cleans learner activity data and flags missing work."
    return f"Portfolio capstone: {project_seed} customized for {profile.goal}."


def match_peer_pod(profile: OnboardingRequest) -> list[str]:
    target = _tokens(profile.goal + " " + " ".join(profile.weak_skills))
    scored: list[tuple[float, str]] = []
    for peer in DEMO_LEARNERS:
        if peer.name == profile.name:
            continue
        peer_tokens = _tokens(peer.goal + " " + peer.background + " " + " ".join(peer.weak_skills))
        shared = len(target & peer_tokens)
        complement = max(0, peer.confidence - profile.confidence)
        availability = 1 if abs(peer.weekly_hours - profile.weekly_hours) <= 4 else 0
        scored.append((shared * 2 + complement + availability, peer.name))
    scored.sort(reverse=True)
    names = [name for _, name in scored[:3]]
    return names or ["Ayesha", "Bilal", "Hina"]


def risk_card(profile: OnboardingRequest) -> RiskCard:
    score, reasons = score_risk(profile)
    weak_skill = profile.weak_skills[0] if profile.weak_skills else "the next concept"
    if score >= 68:
        action = "schedule mentor check-in"
        nudge = (
            f"Hi {profile.name}, let's make today's target smaller. Spend 20 minutes on {weak_skill}, "
            "then send one screenshot or question. Progress counts even when the day is heavy."
        )
    elif score >= 42:
        action = "assign peer pod practice"
        nudge = (
            f"Hi {profile.name}, your next win is close. Pair with your pod for one practice task on "
            f"{weak_skill} and update your confidence score after it."
        )
    else:
        action = "offer stretch challenge"
        nudge = (
            f"Hi {profile.name}, you're on track. Try the stretch task and add one line to your portfolio story today."
        )
    return RiskCard(
        learner=profile.name,
        risk_score=score,
        risk_level=_risk_level(score),
        reasons=reasons,
        nudge=nudge,
        suggested_action=action,
    )


def instructor_dashboard(extra_profiles: list[OnboardingRequest] | None = None) -> InstructorDashboard:
    profiles = [*DEMO_LEARNERS, *(extra_profiles or [])]
    cards = sorted([risk_card(profile) for profile in profiles], key=lambda card: card.risk_score, reverse=True)
    high_count = sum(1 for card in cards if card.risk_level == "high")
    peer_pods = [
        ["Ayesha", "Hina", "Omar"],
        ["Bilal", "Ayesha", "Hina"],
    ]
    summary = (
        f"{high_count} learner(s) need instructor attention today. "
        "Most nudges should be confidence-first, then skill-specific."
    )
    return InstructorDashboard(risk_cards=cards, peer_pods=peer_pods, focus_summary=summary)


def admin_insights(extra_profiles: list[OnboardingRequest] | None = None) -> AdminInsights:
    profiles = [*DEMO_LEARNERS, *(extra_profiles or [])]
    weak_counter = Counter(skill for profile in profiles for skill in profile.weak_skills)
    top_gaps = [skill for skill, _ in weak_counter.most_common(4)] or ["sql", "prompting", "python"]
    avg_risk = round(sum(score_risk(profile)[0] for profile in profiles) / len(profiles))
    health = "steady" if avg_risk < 45 else "needs attention" if avg_risk < 65 else "urgent"
    demand = Counter(recommend_course(profile).title for profile in profiles).most_common()
    return AdminInsights(
        cohort_health=f"Cohort health is {health}; average risk score is {avg_risk}/100.",
        top_skill_gaps=top_gaps,
        content_opportunities=[
            f"Add a 20-minute remedial lab for {top_gaps[0]}.",
            "Create Urdu/Mixed-language recap cards for learners with low confidence.",
            "Turn common weak skills into capstone checkpoints rather than isolated quizzes.",
        ],
        demand_signals=[f"{title}: {count} learner(s)" for title, count in demand],
        recommended_experiments=[
            "Run a confidence check after every second lesson.",
            "Auto-create peer pods every Monday based on weak-skill overlap and availability.",
            "Measure completion lift from instructor nudge cards versus generic reminders.",
        ],
    )


def fallback_coach_answer(profile: OnboardingRequest, question: str, mood: str) -> tuple[str, str]:
    plan = build_today_raasta(profile, mood=mood)
    answer = (
        f"{profile.name}, based on your Learning Twin, keep today simple: {plan.lesson}. "
        f"Your micro-task is: {plan.micro_task} "
        f"This fits because your goal is '{profile.goal}' and your current route is {plan.mode}. "
        "After finishing, send one blocker or one win so the next route can adapt."
    )
    return answer, plan.next_action

