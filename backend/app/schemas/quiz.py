from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .courses import QuizItemOut


class AdaptiveQuizOut(BaseModel):
    module_id: int
    items: List[QuizItemOut]
    weak_concept_ids: List[int]
    rationale: str


class QuizAnswerRequest(BaseModel):
    quiz_item_id: int
    selected_index: int = Field(ge=0)
    seconds: float = Field(ge=0.0, default=0.0)
    retries: int = Field(ge=0, default=0)


class ConceptMasteryDelta(BaseModel):
    concept_id: int
    concept_name: str
    before: float
    after: float


class QuizAnswerResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    quiz_item_id: int
    correct: bool
    correct_index: int
    explanation: str
    mastery_delta: ConceptMasteryDelta
    confusion_triggered: bool
    confusion_message: Optional[str] = None


class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quiz_item_id: int
    correct: bool
    seconds: float
    retries: int
    created_at: str
