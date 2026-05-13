"""AI Tutor endpoints: text Q&A, message history, voice TTS."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..ai.language_detect import detect_language
from ..ai.tutor_rag import TutorAnswer, answer as rag_answer
from ..auth import get_current_user, require_student
from ..config import settings
from ..database import get_db
from ..models import Concept, Mastery, Module, TutorMessage, User
from ..schemas.tutor import TutorCitation, TutorMessageOut, TutorRequest, TutorResponse

router = APIRouter(prefix="/api/tutor", tags=["tutor"])


def _weak_concept_ids(db: Session, user: User) -> List[int]:
    rows = (
        db.query(Mastery.concept_id, Mastery.p_mastery)
        .filter(Mastery.user_id == user.id)
        .order_by(Mastery.p_mastery.asc())
        .limit(3)
        .all()
    )
    return [cid for cid, _ in rows]


@router.post("/ask", response_model=TutorResponse)
def ask(
    payload: TutorRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TutorResponse:
    weak_ids = _weak_concept_ids(db, user)
    language_hint = payload.language_hint
    if user.language_pref and user.language_pref != "auto" and not language_hint:
        language_hint = user.language_pref

    result: TutorAnswer = rag_answer(
        payload.message,
        boost_module_id=payload.module_id,
        boost_concept_ids=weak_ids,
        language_hint=language_hint,
    )

    db.add(
        TutorMessage(
            user_id=user.id,
            role="user",
            content=payload.message,
            module_id=payload.module_id,
            language=result.language,
            citations=[],
        )
    )
    db.add(
        TutorMessage(
            user_id=user.id,
            role="assistant",
            content=result.reply,
            module_id=payload.module_id,
            language=result.language,
            citations=result.citations,
        )
    )
    db.commit()

    return TutorResponse(
        reply=result.reply,
        language=result.language,
        citations=[TutorCitation(**c) for c in result.citations],
        suggested_followups=result.suggested_followups,
        provider=result.provider,
    )


@router.get("/history", response_model=List[TutorMessageOut])
def history(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[TutorMessageOut]:
    rows = (
        db.query(TutorMessage)
        .filter(TutorMessage.user_id == user.id)
        .order_by(TutorMessage.created_at.desc())
        .limit(min(200, limit))
        .all()
    )
    return [TutorMessageOut.model_validate(r) for r in reversed(rows)]


@router.get("/voice/status")
def voice_status():
    return {"enabled": settings.has_elevenlabs}


@router.post("/voice/tts")
def tts(payload: dict, user: User = Depends(get_current_user)):
    text = (payload or {}).get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if not settings.has_elevenlabs:
        raise HTTPException(status_code=503, detail="ElevenLabs not configured")
    try:
        import httpx

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}/stream"
        headers = {
            "xi-api-key": settings.elevenlabs_api_key,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
        }
        body = {
            "text": text[:1200],
            "model_id": "eleven_turbo_v2_5",
            "voice_settings": {"stability": 0.4, "similarity_boost": 0.7},
        }

        def gen():
            with httpx.stream("POST", url, headers=headers, json=body, timeout=60.0) as resp:
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code, detail=resp.text)
                for chunk in resp.iter_bytes():
                    if chunk:
                        yield chunk

        return StreamingResponse(gen(), media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}") from exc
