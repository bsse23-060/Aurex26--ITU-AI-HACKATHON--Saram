from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ConceptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str
    module_id: int


class QuizItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module_id: int
    concept_id: int
    prompt: str
    options: list
    difficulty: float


class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    slug: str
    title: str
    summary: str
    estimated_minutes: int
    position: int


class ModuleDetailOut(ModuleOut):
    content_md: str
    concepts: List[ConceptOut] = []
    refresher_concepts: List[ConceptOut] = []
    related_recommendations: List["ModuleOut"] = []


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    tagline: str
    description: str
    color: str
    icon: str
    instructor_id: Optional[int] = None
    modules: List[ModuleOut] = []


class SkillGraphNode(BaseModel):
    id: int
    slug: str
    name: str
    module_id: int
    module_title: str
    course_id: int
    p_mastery: float
    state: str  # mastered | learning | locked


class SkillGraphEdge(BaseModel):
    src: int
    dst: int


class SkillGraphOut(BaseModel):
    nodes: List[SkillGraphNode]
    edges: List[SkillGraphEdge]


ModuleDetailOut.model_rebuild()
