"""Startup orchestration: init DB, seed, build Chroma index, warm models."""

from __future__ import annotations

import logging
from typing import Iterable

from sqlalchemy.orm import Session

from .ai import at_risk as at_risk_ai
from .ai.tutor_rag import IndexChunk, index_chunks, reset_collection
from .database import SessionLocal, init_db
from .models import Concept, Course, Module
from .seed.seeder import seed_all

_log = logging.getLogger(__name__)


def _chunk_module(module: Module, concepts: Iterable[Concept]) -> Iterable[IndexChunk]:
    text = module.content_md or module.summary or ""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    concept_names = ", ".join(c.name for c in concepts)
    primary_concept = next(iter(concepts), None)
    if not paragraphs:
        paragraphs = [module.summary]
    for idx, para in enumerate(paragraphs):
        yield IndexChunk(
            id=f"mod-{module.id}-p{idx}",
            text=f"{module.title}\n{para}",
            metadata={
                "module_id": module.id,
                "module_title": module.title,
                "concept_id": primary_concept.id if primary_concept else 0,
                "concept_name": primary_concept.name if primary_concept else concept_names,
            },
        )


def rebuild_chroma_index(db: Session) -> int:
    reset_collection()
    modules = db.query(Module).all()
    chunks = []
    for module in modules:
        concepts = list(module.concepts)
        chunks.extend(_chunk_module(module, concepts))
    if not chunks:
        return 0
    return index_chunks(chunks)


def startup(seed: bool = True, build_index: bool = True, warm_ml: bool = True) -> None:
    init_db()
    if seed:
        with SessionLocal() as db:
            stats = seed_all(db)
            _log.info("Seed stats: %s", stats)
    if build_index:
        try:
            with SessionLocal() as db:
                n = rebuild_chroma_index(db)
                _log.info("Indexed %d chunks into Chroma", n)
        except Exception as exc:  # noqa: BLE001
            _log.warning("Skipped Chroma indexing: %s", exc)
    if warm_ml:
        try:
            at_risk_ai.warm_up()
        except Exception as exc:  # noqa: BLE001
            _log.warning("At-risk model warm-up failed: %s", exc)
