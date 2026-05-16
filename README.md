# Aurex26--ITU-AI-HACKATHON--Saram

## Deploy on Hugging Face Spaces

This project is set up to deploy as a single **Docker Space** that serves both the React frontend and the FastAPI backend from one URL.

### Steps

1. Create a new Space on Hugging Face and choose the **Docker** template.
2. Push this repository to the Space, or connect the repo if you are using Git.
3. In the Space settings, add any production environment variables you need. Typical values include:
	- `JWT_SECRET`
	- `GEMINI_API_KEY`
	- `GROQ_API_KEY`
	- `ELEVENLABS_API_KEY`
4. Let Hugging Face build the Space. The root [Dockerfile](Dockerfile) builds the frontend and starts the backend on port `7860`.
5. Open the Space URL. The frontend loads at `/`, and the API remains available under `/api/...`.

### Notes

- The app currently uses local SQLite storage under `backend/data`, so data is not durable unless you enable persistent storage or move to an external database.
- You do not need `VITE_API_URL` for the single-Space setup because the frontend and backend share the same origin.