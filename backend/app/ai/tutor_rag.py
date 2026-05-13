"""RAG-based AI tutor.

We avoid heavyweight vector databases on purpose: the course catalogue is
small (~50 chunks), so a NumPy-backed in-memory store is faster, has no
native build dependencies on Windows, and is trivial to persist with joblib.

Pipeline:
  1. Detect input language (Roman Urdu / Urdu / English).
  2. Retrieve top-k content chunks by cosine similarity, with a boost towards
     the learner's current module and weak concepts.
  3. Build a system prompt that grounds the model, enforces citation style,
     and adapts language register to the detected language.
  4. Call Groq for fast streaming; gracefully fall back to a retrieval-only
     answer if no LLM key is present.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Optional

import joblib
import numpy as np

from ..config import settings
from .embeddings import embed_text, embed_texts
from .language_detect import detect_language, system_language_instruction

_log = logging.getLogger(__name__)


@dataclass
class IndexChunk:
    id: str
    text: str
    metadata: dict


@dataclass
class _Store:
    ids: List[str] = field(default_factory=list)
    texts: List[str] = field(default_factory=list)
    metas: List[dict] = field(default_factory=list)
    vectors: Optional[np.ndarray] = None  # shape (n, d)


_lock = threading.Lock()
_store: _Store = _Store()
_INDEX_PATH = Path(settings.chroma_dir) / "lms_index.joblib"


def _load_persisted() -> None:
    global _store
    if not _INDEX_PATH.exists():
        return
    try:
        data = joblib.load(_INDEX_PATH)
        _store = _Store(
            ids=data["ids"],
            texts=data["texts"],
            metas=data["metas"],
            vectors=np.asarray(data["vectors"], dtype=np.float32),
        )
        _log.info("Loaded persisted RAG index with %d chunks", len(_store.ids))
    except Exception as exc:  # noqa: BLE001
        _log.warning("Failed to load persisted RAG index: %s", exc)


def _persist() -> None:
    try:
        _INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "ids": _store.ids,
                "texts": _store.texts,
                "metas": _store.metas,
                "vectors": _store.vectors.tolist() if _store.vectors is not None else [],
            },
            _INDEX_PATH,
        )
    except Exception as exc:  # noqa: BLE001
        _log.warning("Failed to persist RAG index: %s", exc)


_load_persisted()


def reset_collection() -> None:
    global _store
    with _lock:
        _store = _Store()


def index_chunks(chunks: Iterable[IndexChunk], batch_size: int = 64) -> int:
    items = list(chunks)
    if not items:
        return 0
    with _lock:
        texts = [c.text for c in items]
        vecs_list: List[List[float]] = []
        for i in range(0, len(texts), batch_size):
            vecs_list.extend(embed_texts(texts[i : i + batch_size]))
        new_vecs = np.asarray(vecs_list, dtype=np.float32)
        _store.ids = [c.id for c in items]
        _store.texts = texts
        _store.metas = [c.metadata for c in items]
        _store.vectors = new_vecs
        _persist()
    return len(items)


@dataclass
class RetrievedChunk:
    id: str
    text: str
    metadata: dict
    distance: float  # lower is better; we use (1 - cosine_similarity)


def retrieve(
    query: str,
    k: int = 5,
    boost_module_id: Optional[int] = None,
    boost_concept_ids: Optional[List[int]] = None,
) -> List[RetrievedChunk]:
    if _store.vectors is None or len(_store.ids) == 0:
        return []
    try:
        q_vec = np.asarray(embed_text(query), dtype=np.float32)
    except Exception as exc:  # noqa: BLE001
        _log.warning("Embedding query failed: %s", exc)
        return []

    # All vectors are L2-normalized by the embedding model, so cosine = dot.
    sims = _store.vectors @ q_vec  # shape (n,)
    base_distances = 1.0 - sims  # lower is better

    boost_concepts = set(boost_concept_ids or [])
    adjusted = base_distances.copy()
    if boost_module_id is not None or boost_concepts:
        for i, meta in enumerate(_store.metas):
            if boost_module_id and meta.get("module_id") == boost_module_id:
                adjusted[i] -= 0.15
            if boost_concepts and meta.get("concept_id") in boost_concepts:
                adjusted[i] -= 0.10

    order = np.argsort(adjusted)[: max(k, 1)]
    results: List[RetrievedChunk] = []
    for idx in order:
        i = int(idx)
        results.append(
            RetrievedChunk(
                id=_store.ids[i],
                text=_store.texts[i],
                metadata=_store.metas[i],
                distance=float(adjusted[i]),
            )
        )
    return results


@dataclass
class TutorAnswer:
    reply: str
    language: str
    citations: List[dict]
    suggested_followups: List[str]
    provider: str = "offline"


_SYSTEM_BASE = """
You are atomcamp's friendly, encouraging AI tutor and course advisor for learners in Pakistan.

Hard rules:
- For atomcamp courses, learner progress, quizzes, goals, career readiness, and platform questions,
  ground your answer in the provided context when possible.
- For general questions not covered by the context, answer helpfully using your general knowledge,
  and clearly separate general guidance from atomcamp-specific guidance.
- Inline citations look like [#1], [#2] referring to the numbered context blocks.
- Keep replies under ~180 words unless the learner asks for depth.
- Be warm, never condescending. Celebrate effort.
- Mention the next concrete learning action when the learner appears stuck.

After your reply, always include exactly THREE follow-up question suggestions
prefixed with "FOLLOWUPS:" on a new line, separated by " | ".
""".strip()

_ATOMCAMP_COURSE_CONTEXT = """
atomcamp course offering context:
- AI Bootcamp: for engineers and early-career builders who want Python, machine learning, generative AI, applied AI projects, and portfolio readiness.
- Data Analytics Bootcamp: for learners moving into analytics roles through Excel, SQL, Power BI, dashboards, and decision storytelling.
- Automation with AI: for professionals and teams who want to automate repetitive work and productivity workflows with modern AI tools.
- Agentic AI Bootcamp: for learners who already know the basics and want agents, RAG, tool use, workflow orchestration, and evaluation.
- AI for Teens: an introductory, safe, creative AI program for younger learners.
- Python Summer Coding Camp: a beginner-friendly programming track focused on Python, logic, problem solving, and mini apps.
Homepage signals: 80% job placement, 45% women participation, 70 corporate clients, 10,000 people trained in bootcamps, and 200+ soft skills trainings.
""".strip()


def _build_messages(query: str, language: str, chunks: List[RetrievedChunk]) -> List[dict]:
    context_block = (
        "\n\n".join(
            f"[#{i + 1}] (module: {c.metadata.get('module_title', '?')}; "
            f"concept: {c.metadata.get('concept_name', '?')})\n{c.text}"
            for i, c in enumerate(chunks)
        )
        or "(no context retrieved)"
    )
    language_rules = system_language_instruction(language)
    system = f"{_SYSTEM_BASE}\n\nLANGUAGE RULES:\n{language_rules}"
    user = f"CONTEXT:\n{context_block}\n\nLEARNER QUESTION:\n{query}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def _parse_followups(text: str) -> tuple[str, List[str]]:
    if "FOLLOWUPS:" not in text:
        return text.strip(), []
    head, _, tail = text.rpartition("FOLLOWUPS:")
    suggestions = [s.strip(" -*\u2022") for s in tail.split("|")]
    suggestions = [s for s in suggestions if s][:3]
    return head.strip(), suggestions


def _stub_answer(query: str, language: str, chunks: List[RetrievedChunk]) -> str:
    if not chunks:
        lower = query.lower()
        if any(term in lower for term in ("course", "bootcamp", "atomcamp", "ai engineering", "data analytics", "agent")):
            return (
                "For AI engineering, start with atomcamp's AI Bootcamp if you want the broad path: Python, "
                "machine learning, generative AI, and portfolio work. If your goal is dashboards and business "
                "decisions, choose Data Analytics Bootcamp. If you already know the basics and want workflow "
                "automation, Automation with AI or Agentic AI Bootcamp is the sharper fit. Next action: set your "
                "goal and weekly hours, then generate a roadmap so quizzes, feedback, and career readiness stay tied together."
            )
        if any(term in lower for term in ("hello", "hi", "help", "stuck", "explain", "what is", "how do")):
            return (
                "I can help with atomcamp course choices, quiz feedback, career planning, and general learning questions. "
                "Ask me the exact thing you're stuck on, and I'll give a short explanation plus the next practice step. "
                "Live Gemini is not configured yet, so this is the local fallback response."
            )
        return (
            "I can answer that once Gemini is configured. For now, I can still help with atomcamp course selection, "
            "roadmap planning, quizzes, progress feedback, and career outcomes from the local LMS data."
        )
    bullets = "\n".join(f"[#{i + 1}] {c.text[:180]}..." for i, c in enumerate(chunks[:3]))
    return (
        "Here's what the course material says about your question:\n\n"
        f"{bullets}\n\n(Live LLM is offline; showing top retrieved passages.)"
    )


def _gemini_answer(query: str, language: str, chunks: List[RetrievedChunk]) -> Optional[tuple[str, List[str]]]:
    if not settings.has_gemini:
        return None
    try:
        import google.generativeai as genai

        retrieved_context = (
            "\n\n".join(
                f"[#{i + 1}] (module: {c.metadata.get('module_title', '?')}; "
                f"concept: {c.metadata.get('concept_name', '?')})\n{c.text}"
                for i, c in enumerate(chunks)
            )
            or "(no atomcamp course context retrieved for this query)"
        )
        context_block = f"{_ATOMCAMP_COURSE_CONTEXT}\n\nRetrieved LMS context:\n{retrieved_context}"
        language_rules = system_language_instruction(language)
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = f"{_SYSTEM_BASE}\n\nLANGUAGE RULES:\n{language_rules}\n\nCONTEXT:\n{context_block}\n\nLEARNER QUESTION:\n{query}"
        response = model.generate_content(prompt)
        raw = getattr(response, "text", "") or ""
        if not raw.strip():
            return None
        return _parse_followups(raw)
    except Exception as exc:  # noqa: BLE001 - provider failure should not break the UI
        _log.warning("Gemini tutor failed, trying next provider: %s", exc)
        return None


def answer(
    query: str,
    boost_module_id: Optional[int] = None,
    boost_concept_ids: Optional[List[int]] = None,
    language_hint: Optional[str] = None,
) -> TutorAnswer:
    language = language_hint if language_hint in {"en", "ur", "roman_ur"} else detect_language(query)
    chunks = retrieve(query, k=5, boost_module_id=boost_module_id, boost_concept_ids=boost_concept_ids)
    citations = [
        {
            "module_id": int(c.metadata.get("module_id", 0)),
            "module_title": str(c.metadata.get("module_title", "")),
            "concept": c.metadata.get("concept_name"),
            "snippet": c.text[:220],
        }
        for c in chunks
    ]

    if not settings.has_groq:
        gemini = _gemini_answer(query, language, chunks)
        if gemini:
            reply, followups = gemini
            return TutorAnswer(
                reply=reply,
                language=language,
                citations=citations,
                suggested_followups=followups,
                provider="gemini",
            )
        reply = _stub_answer(query, language, chunks)
        return TutorAnswer(reply=reply, language=language, citations=citations, suggested_followups=[], provider="offline")

    gemini = _gemini_answer(query, language, chunks)
    if gemini:
        reply, followups = gemini
        return TutorAnswer(
            reply=reply,
            language=language,
            citations=citations,
            suggested_followups=followups,
            provider="gemini",
        )

    try:
        from groq import Groq

        client = Groq(api_key=settings.groq_api_key)
        messages = _build_messages(query, language, chunks)
        completion = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.4,
            max_tokens=600,
        )
        raw = completion.choices[0].message.content or ""
        reply, followups = _parse_followups(raw)
        return TutorAnswer(
            reply=reply,
            language=language,
            citations=citations,
            suggested_followups=followups,
            provider="groq",
        )
    except Exception as exc:  # noqa: BLE001
        _log.warning("Groq tutor failed, falling back to retrieval stub: %s", exc)
        reply = _stub_answer(query, language, chunks)
        return TutorAnswer(reply=reply, language=language, citations=citations, suggested_followups=[], provider="offline")
