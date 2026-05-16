"""FastAPI entry point for the Smart Adaptive LMS."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from .bootstrap import startup
from .config import settings
from .routers import admin_courses as admin_courses_router
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
REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"


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

  if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    app.mount("/static", StaticFiles(directory=FRONTEND_DIST), name="frontend")


@app.get("/", response_class=HTMLResponse)
def root():
    """Serve the SPA when the frontend is built, otherwise show the backend landing page."""

    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
  return index_file.read_text(encoding="utf-8")

    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>atomcamp Smart LMS — API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1e1b4b; }
    a { color: #7c3aed; }
    code { background: #f5f3ff; padding: 0.15rem 0.4rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>atomcamp Smart LMS</h1>
  <p>This is the <strong>FastAPI backend</strong>. There is no SPA here — open the <strong>Vite frontend</strong> at
     <code>http://localhost:5173</code> (or whatever port you configured).</p>
  <ul>
    <li><a href="/docs">Swagger UI</a> — try <code>POST /api/auth/login</code> with demo accounts from <code>GET /api/auth/demo-accounts</code></li>
    <li><a href="/redoc">ReDoc</a></li>
    <li><a href="/api/health">GET /api/health</a></li>
  </ul>
  <p><small>Console noise from browser extensions (e.g. NinjaHumanizer) is unrelated to this app.</small></p>
</body>
</html>"""

@app.get("/{full_path:path}", response_class=HTMLResponse)
def spa_fallback(full_path: str):
    if full_path.startswith("api/") or full_path in {"docs", "redoc", "openapi.json"}:
        return HTMLResponse(status_code=404, content="Not found")

    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return index_file.read_text(encoding="utf-8")

    return HTMLResponse(status_code=404, content="Frontend build not found")


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
app.include_router(admin_courses_router.router)
