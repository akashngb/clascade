# SlideQuest Pipeline — Slide → Lesson Spec generator

Turns a lesson description (or slide text) into a **validated Lesson Spec** using
Gemini on Vertex AI. The renderer plays the spec as a walkable, room-by-room
lesson. The model never writes rendering code — it only fills the spec (CLAUDE.md §3).

## Setup

```bash
cd services/pipeline
npm install
cp .env.example .env      # then edit .env
```

Fill in `.env`:

- `GCP_PROJECT`, `GCP_LOCATION` (e.g. `us-central1`)
- **One** of:
  - `GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/key.json` (a file **outside** the repo), or
  - `GOOGLE_SERVICE_ACCOUNT_JSON='{...}'` (the JSON inline, single line)
- `GEMINI_MODEL` (optional; defaults to `gemini-2.0-flash-001` — override per the
  routing table in CLAUDE.md, e.g. a Gemini 3.x Pro/Flash you have access to)

> ⚠️ **Security:** `.env` and `*.json` keys are git-ignored. Never paste a private
> key into chat, commit it, or hardcode it. If a key is ever exposed, rotate it in
> GCP Console → IAM → Service Accounts → Keys.

## Usage

```bash
# print the spec
node generate.js "make a grade 7 lesson on the water cycle"

# or write it to a file
node generate.js "grade 5 lesson on the solar system" --out lesson.json
```

The generator asks Gemini for structured JSON, validates it against the Lesson
Spec schema, and retries up to 3× (feeding validation errors back to the model)
before giving up. Only a spec that passes `validateSpec` is ever emitted.

## Output shape

See `src/lessonSpecSchema.js`. Each phase becomes one room the student walks
through; `interaction.type` is `cinematic`, `explore`, or `quiz`.

## Next step (renderer side)

The renderer currently hand-lays-out the DNA hero lesson's rooms. To play an
*arbitrary* generated spec, add a procedural room-layout pass that builds the
room chain from `spec.phases` (one room per phase, generic props by interaction
type). Tracked as a follow-up.
