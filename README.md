# Clascade

Clascade turns lesson material into reviewable, teacher-controlled interactive experiences. The AI produces a validated Lesson Spec. The application owns the renderer, review workflow, safety controls, classroom pacing, and learning signals.

## What is implemented

- Teacher studio with prompt and source upload
- Vertex AI structured-output pipeline with local fallback
- Shared Zod Lesson Spec validator
- Citation and safety review UI
- Publish and presenter workflows
- Teacher-controlled phase sync and pause state
- Student join, objective, dialogue, and quiz experience
- Three.js scene preview with a Chromebook-friendly pixel-ratio cap
- Leaderboard, learning insights, and asset library surfaces
- Poly Pizza catalog fallback without exposing its key to the browser

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000/teach` for the teacher console and `http://localhost:3000/play/CELL42` for the student view.

## Environment

`GOOGLE_SERVICE_ACCOUNT_JSON`, `GCP_PROJECT`, and `GCP_LOCATION` activate Vertex AI. `VERTEX_MODEL` defaults to `gemini-2.5-flash`. `POLY_PIZZA_API_KEY` is server-only.

Do not commit real credentials. For production, set them in the deployment provider's environment settings.

## Architecture

- `src/lib/lesson-spec.ts`: the renderer and pipeline contract
- `src/lib/pipeline.ts`: server-only Vertex generation
- `src/components/teacher-console.tsx`: teacher authoring, review, live, and analytics UI
- `src/components/student-experience.tsx`: class join and controlled playback
- `src/app/api/sessions/[code]`: development session sync contract

The in-memory session store is intentional for the runnable prototype. Replace its implementation with Firestore while preserving the route contract for durable multi-instance production sync.
