from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TutorRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    module_id: Optional[int] = None
    language_hint: Optional[str] = None  # "auto" | "en" | "ur" | "roman_ur"


class TutorCitation(BaseModel):
    module_id: int
    module_title: str
    concept: Optional[str] = None
    snippet: str


class TutorResponse(BaseModel):
    reply: str
    language: str
    citations: List[TutorCitation]
    suggested_followups: List[str] = []


class TutorMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    language: str
    citations: list
    created_at: datetime


class EngagementEventIn(BaseModel):
    kind: str = Field(min_length=1, max_length=32)
    module_id: Optional[int] = None
    payload: dict = Field(default_factory=dict)


class ConfusionEvent(BaseModel):
    quiz_item_id: Optional[int] = None
    module_id: Optional[int] = None
    seconds_on_task: float
    retries: int = 0
    scroll_reversals: int = 0
    idle_seconds: float = 0.0
