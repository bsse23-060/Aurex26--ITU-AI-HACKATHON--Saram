# RaastaAI

RaastaAI is a hackathon-ready adaptive LMS prototype for atomcamp. It creates a personal **Learning Twin** for each learner, recommends **Today’s Raasta**, adapts to mood/confidence, matches peer pods, and gives instructors explainable nudge cards.

## Why it is unique

- Not a generic LMS chatbot: every recommendation is tied to a learner twin, skill gap, confidence signal, time constraint, and career goal.
- Same atomcamp catalog, different personal routes for different learners.
- Instructors see risk reasons and ready-to-send supportive nudges instead of only red/yellow/green scores.
- Optional LLM support adds warmer personal coaching, while the local engine keeps the demo working without API access.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URL: `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://127.0.0.1:5173`

## Optional LLM setup

Copy `.env.example` to `.env` and set:

```bash
LLM_API_URL=
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
```

If those values are missing or the API fails, `/api/coach` returns a local fallback response.

## Organizer dataset

Place the provided dataset at either:

- `data/organizer_learners.csv`
- `data/organizer_learners.json`

Expected fields: `name`, `goal`, `background`, `weekly_hours`, `language`, `confidence`, `baseline_quiz`, `attendance_rate`, `activity_rate`, `motivation_style`, `barriers`, `weak_skills`.

For CSV list fields, separate values with `|`, for example `sql|data storytelling`.

## Demo script

1. Open Learner GPS and switch between Ayesha and Bilal.
2. Show how the same atomcamp catalog creates different paths.
3. Select `Low confidence`, set confidence to `2`, and click **Adapt today’s Raasta**.
4. Ask the AI coach what the learner should do first.
5. Open Instructor Radar and show risk reasons, peer pods, and nudge cards.
6. Open Admin Signals and show cohort gaps plus content opportunities.

## API

- `GET /api/health`
- `GET /api/courses`
- `GET /api/demo`
- `POST /api/onboarding`
- `GET /api/learners/{id}/path`
- `POST /api/checkin`
- `POST /api/coach`
- `GET /api/instructor/risk`
- `GET /api/admin/insights`

## Test checklist

- Different learner profiles produce different daily routes.
- Low confidence changes the route to repair/support mode.
- Instructor dashboard shows risk reasons and a nudge card.
- Coach endpoint works with and without LLM credentials.
- Full demo flow fits inside 3 minutes.

