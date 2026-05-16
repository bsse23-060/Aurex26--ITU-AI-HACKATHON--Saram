"""AI Tutor endpoints: text Q&A, message history, voice TTS."""

from __future__ import annotations

from typing import List

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

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
    return {
        # legacy field used by the older frontend chat; mirrors tts_enabled
        "enabled": settings.has_elevenlabs,
        "tts_enabled": settings.has_elevenlabs,
        "stt_enabled": settings.has_groq,
        "voice_id": settings.elevenlabs_voice_id if settings.has_elevenlabs else None,
        "stt_model": "whisper-large-v3" if settings.has_groq else None,
        "stt_languages": ["auto", "en", "ur"],
    }


@router.post("/voice/tts")
def tts(payload: dict, user: User = Depends(get_current_user)):
    """Synthesise speech with ElevenLabs.

    We POST to the non-streaming endpoint and read the entire body before
    returning, so any 4xx/5xx from ElevenLabs surfaces as a JSON error in
    FastAPI instead of a half-broken audio stream the browser can't decode.
    """

    text = (payload or {}).get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if not settings.has_elevenlabs:
        raise HTTPException(status_code=503, detail="ElevenLabs not configured")

    voice_id = (settings.elevenlabs_voice_id or "EXAVITQu4vr4xnSDxMaL").strip()
    # eleven_multilingual_v2 supports English + Urdu (Roman Urdu is read phonetically).
    # eleven_turbo_v2_5 is faster but English-leaning and gated for some accounts.
    model_id = (payload or {}).get("model_id") or "eleven_multilingual_v2"

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }
    body = {
        "text": text[:1200],
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        },
    }

    try:
        import httpx

        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, headers=headers, json=body)
    except httpx.HTTPError as exc:
        logger.exception("ElevenLabs request failed")
        raise HTTPException(status_code=502, detail=f"ElevenLabs unreachable: {exc}") from exc

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="ElevenLabs API key is invalid or revoked")
    if resp.status_code == 422:
        raise HTTPException(status_code=422, detail=f"ElevenLabs rejected request: {resp.text[:300]}")
    if resp.status_code != 200:
        # Try to extract a clean message from the JSON error envelope.
        msg = resp.text[:300]
        try:
            data = resp.json()
            msg = data.get("detail") or data.get("message") or msg
            if isinstance(msg, dict):
                msg = msg.get("message") or str(msg)[:300]
        except Exception:  # noqa: BLE001
            pass
        logger.warning("ElevenLabs returned %s: %s", resp.status_code, msg)
        raise HTTPException(status_code=resp.status_code, detail=f"ElevenLabs: {msg}")

    audio = resp.content
    if not audio:
        raise HTTPException(status_code=502, detail="ElevenLabs returned an empty audio body")

    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store",
            "Content-Length": str(len(audio)),
        },
    )


# ---------------------------------------------------------------------------
# Speech to text (Groq Whisper-Large-v3)
# ---------------------------------------------------------------------------

# Whisper-large-v3 handles 99 languages including Urdu natively.
_STT_ALLOWED_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/wav",
    "audio/x-wav",
    "audio/m4a",
    "audio/x-m4a",
    "video/webm",  # MediaRecorder sometimes labels webm as video/webm even when audio-only
}
_STT_MAX_BYTES = 25 * 1024 * 1024  # 25 MB — Groq limit


@router.post("/voice/stt")
async def stt(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    user: User = Depends(get_current_user),
):
    """Transcribe an audio clip via Groq Whisper-large-v3.

    Accepts `language` as ``"auto"`` (let Whisper detect), ``"en"``, or ``"ur"``.
    Returns the recognised text plus the detected language code.
    """

    if not settings.has_groq:
        raise HTTPException(status_code=503, detail="Speech-to-text not configured (set GROQ_API_KEY)")

    content_type = (audio.content_type or "").lower()
    if content_type and content_type.split(";", 1)[0].strip() not in _STT_ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported audio type: {content_type}. Use webm, ogg, mp3, wav, m4a, or mp4.",
        )

    raw = await audio.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio upload")
    if len(raw) > _STT_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Audio too large (limit 25 MB)")

    filename = audio.filename or "clip.webm"
    upload_mime = content_type or "audio/webm"

    form_data: dict = {
        "model": (None, "whisper-large-v3"),
        "response_format": (None, "json"),
        "temperature": (None, "0"),
    }
    lang = (language or "auto").lower().strip()
    if lang in {"en", "ur"}:
        form_data["language"] = (None, lang)

    files = {
        "file": (filename, raw, upload_mime),
        **form_data,
    }

    try:
        import httpx

        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                files=files,
            )
    except httpx.HTTPError as exc:
        logger.exception("Groq STT request failed")
        raise HTTPException(status_code=502, detail=f"Groq unreachable: {exc}") from exc

    if resp.status_code != 200:
        msg = resp.text[:300]
        try:
            data = resp.json()
            msg = data.get("error", {}).get("message") or data.get("detail") or msg
        except Exception:  # noqa: BLE001
            pass
        logger.warning("Groq STT returned %s: %s", resp.status_code, msg)
        # Map auth failures clearly; otherwise mirror Groq's status.
        status = resp.status_code if resp.status_code in {400, 401, 413, 415, 422} else 502
        raise HTTPException(status_code=status, detail=f"Groq STT: {msg}")

    try:
        data = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="Invalid response from Groq STT") from exc

    text = (data.get("text") or "").strip()
    detected = data.get("language") or (lang if lang in {"en", "ur"} else "auto")
    duration = data.get("duration")

    if not text:
        raise HTTPException(status_code=422, detail="No speech detected. Try recording again.")

    return {
        "text": text,
        "language": detected,
        "duration_s": duration,
        "model": "whisper-large-v3",
    }
