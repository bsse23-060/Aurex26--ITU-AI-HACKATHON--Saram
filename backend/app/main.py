"""FastAPI entry point for the Smart Adaptive LMS."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .bootstrap import startup
from .config import settings
from .routers import auth as auth_router
from .routers import courses as courses_router
from .routers import graph_career_twin as gct_router
from .routers import instructor as instructor_router
from .routers import onboarding as onboarding_router
from .routers import student as student_router
from .routers import tutor as tutor_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
_log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _log.info("Booting atomcamp Smart LMS (env=%s)", settings.environment)
    startup(seed=True, build_index=True, warm_ml=True)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Smart Adaptive LMS for atomcamp",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "env": settings.environment,
        "providers": {
            "gemini": settings.has_gemini,
            "groq": settings.has_groq,
            "elevenlabs": settings.has_elevenlabs,
        },
    }


app.include_router(auth_router.router)
app.include_router(courses_router.router)
app.include_router(onboarding_router.router)
app.include_router(student_router.router)
app.include_router(gct_router.router)
app.include_router(tutor_router.router)
app.include_router(instructor_router.router)
