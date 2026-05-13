"""Pydantic request/response schemas."""

from .auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from .courses import (
    ConceptOut,
    CourseOut,
    ModuleDetailOut,
    ModuleOut,
    QuizItemOut,
    SkillGraphOut,
)
from .learner import (
    CareerOut,
    DNAVector,
    MasteryOut,
    OnboardingRequest,
    PeerTwinOut,
    RecommendationOut,
    RoadmapOut,
    RoadmapStepOut,
)
from .quiz import (
    AdaptiveQuizOut,
    AttemptOut,
    QuizAnswerRequest,
    QuizAnswerResult,
)
from .tutor import (
    ConfusionEvent,
    EngagementEventIn,
    TutorMessageOut,
    TutorRequest,
    TutorResponse,
)
from .instructor import (
    AdminAnalyticsOut,
    AtRiskStudentOut,
    BurnoutFlagOut,
    CourseAnalyticsOut,
    InstructorDashboardOut,
    StudentDetailOut,
)

__all__ = [
    "AdaptiveQuizOut",
    "AdminAnalyticsOut",
    "AtRiskStudentOut",
    "AttemptOut",
    "BurnoutFlagOut",
    "CareerOut",
    "ConceptOut",
    "ConfusionEvent",
    "CourseAnalyticsOut",
    "CourseOut",
    "DNAVector",
    "EngagementEventIn",
    "InstructorDashboardOut",
    "LoginRequest",
    "MasteryOut",
    "ModuleDetailOut",
    "ModuleOut",
    "OnboardingRequest",
    "PeerTwinOut",
    "QuizAnswerRequest",
    "QuizAnswerResult",
    "QuizItemOut",
    "RecommendationOut",
    "RegisterRequest",
    "RoadmapOut",
    "RoadmapStepOut",
    "SkillGraphOut",
    "StudentDetailOut",
    "TokenResponse",
    "TutorMessageOut",
    "TutorRequest",
    "TutorResponse",
    "UserOut",
]
