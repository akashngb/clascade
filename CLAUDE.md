# PROJECT SPEC — "ClassForge" (working title, rename freely)
### Slideshow-to-Interactive-Lesson Engine | cuHacking 2026
### Version 1.0 — Hand this to Claude Code

---

## 1. VISION AND POSITIONING

**One-liner:** Teachers upload their existing lesson slides (or just describe a lesson in chat) and get back a polished, curriculum-grounded, teacher-controlled interactive 3D experience their whole class plays together in the browser, with the teacher conducting every phase from their own screen.

**The problem:** Students can't focus on slideshows. Teachers don't have time or skills to build games. Existing "AI makes a game" demos are one-shot code generation: unverified, ugly, and the teacher loses control of the classroom the moment students open it.

**Why this is not a wrapper (memorize this for judging):**
1. **Spec-first architecture.** The AI never writes rendering code. It produces a validated, structured Lesson Spec (JSON intermediate representation). Our hand-built renderer and templates consume it. The IR can be reviewed, edited, fact-checked, and reused.
2. **Hand-built pedagogy templates.** 3-5 polished Three.js game templates built by us. Constrained generation = consistent visual quality.
3. **Grounded accuracy agent.** Every content beat is fact-checked against real sources via Google Search grounding, with citations surfaced to the teacher for approval.
4. **Teacher-in-the-loop, twice.** Once at authoring time (citation/content review screen) and once at teaching time (realtime phase control over every student's screen).
5. **Multi-provider model routing.** Each pipeline stage routed to the best model in the world for that job (Gemini, Claude, Chirp, Lyria, Veo, Mistral OCR, ShieldGemma).
6. **Retention telemetry.** The game reports back which concepts students struggled with. It's an education product, not a toy.

**Pitch framing:** "Claude Code gives you an unverified one-off game. We give teachers a reviewable, curriculum-grounded, classroom-controlled experience with retention analytics."

---

## 2. SYSTEM ARCHITECTURE

```
                        ┌─────────────────────────────────────────┐
                        │              TEACHER APP (UI)           │
                        │  chat console · upload · review · edit  │
                        └───────────────┬─────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────┐
                 │              GENERATION PIPELINE             │
                 │                                              │
                 │  1. INGEST      Mistral OCR + Gemini 3.1 Pro │
                 │  2. BEAT-IFY    Gemini 3.1 Pro (1M ctx)      │
                 │  3. TEMPLATE    classifier picks pedagogy    │
                 │  4. SPEC GEN    Gemini 3.5 Flash (parallel)  │
                 │  5. GROUNDING   Gemini + Search grounding    │
                 │  6. SAFETY      ShieldGemma 2 age check      │
                 │  7. SCENE FILL  Claude Sonnet/Opus 4.6       │
                 │  8. ASSETS      Nano Banana Pro / Tripo /    │
                 │                 library / Lyria / Chirp      │
                 └──────────────────────┬──────────────────────┘
                                        │  Lesson Spec (JSON) + assets
                 ┌──────────────────────▼──────────────────────┐
                 │            RENDERER (our code)               │
                 │   Three.js templates + Rapier physics        │
                 │   loads spec → playable browser game         │
                 └──────────────────────┬──────────────────────┘
                                        │
        ┌───────────────────────────────▼───────────────────────────────┐
        │                    CLASSROOM SYNC (Firestore)                  │
        │  teacher writes currentPhase → all student clients react live  │
        │  telemetry events flow back → teacher dashboard                │
        └───────────────────────────────────────────────────────────────┘
```

**Core design law: the LLM fills templates, it never freestyles rendering code.** All visual quality lives in our hand-built templates. All content lives in the spec. This separation is the entire product.

---

## 3. THE LESSON SPEC (JSON INTERMEDIATE REPRESENTATION)

The single most important artifact in the system. Everything reads/writes this.

```jsonc
{
  "lessonId": "uuid",
  "title": "The Assassination of Franz Ferdinand",
  "subject": "history",
  "gradeLevel": 7,
  "template": "cinematic_timeline",       // which pedagogy template renders this
  "sourceDeck": "uploads/ww1-intro.pdf",
  "teacherVoiceId": "chirp-custom-voice-id | null",
  "status": "draft | reviewed | published",
  "safetyReport": {                        // ShieldGemma output
    "flags": [
      {
        "phaseId": "phase-4",
        "issue": "depicts_violence",
        "adjustment": "Student role changed from actor to bystander; event shown via cinematic cutaway.",
        "teacherApproved": true
      }
    ]
  },
  "phases": [                              // one phase ≈ one slide/concept beat
    {
      "phaseId": "phase-1",
      "beatTitle": "Sarajevo, June 28, 1914",
      "learningObjective": "Situate the event in time and place.",
      "narration": {
        "text": "The morning of June 28th, 1914...",
        "voice": "teacher_custom | stock",
        "audioAsset": "assets/phase1-narration.mp3"
      },
      "scene": {
        "environment": "sarajevo_street",   // maps to template environment slot
        "cameraScript": [                   // template-defined camera moves
          { "move": "date_title_cinematic", "duration": 4 },
          { "move": "crane_down_to_street", "duration": 6 }
        ],
        "actors": [
          { "id": "franz", "asset": "tripo/franz.glb", "path": "motorcade_route" }
        ],
        "music": { "asset": "assets/lyria-phase1.mp3", "mood": "tense_strings" }
      },
      "interaction": {
        "type": "explore | objective | quiz | sandbox_params | dialogue | none",
        "objective": "Find the newspaper stand and read the headline.",
        "completionEvent": "read_headline",
        "quiz": null
      },
      "npcs": [
        {
          "id": "bystander-1",
          "liveApi": true,                  // Gemini Live API voice NPC
          "persona": "1914 Sarajevo shopkeeper; answers only from grounded lesson context; deflects off-topic questions back to lesson",
          "groundedFacts": ["citation-3", "citation-7"]
        }
      ],
      "grounding": {
        "claims": [
          {
            "claim": "The motorcade route was published in advance.",
            "source": "https://...",
            "confidence": "high",
            "teacherApproved": true
          }
        ]
      },
      "telemetryEvents": ["phase_enter", "objective_complete", "quiz_answer", "npc_question_asked", "replay"]
    }
  ]
}
```

**Validation:** JSON Schema (zod on the frontend, jsonschema in the pipeline). A spec that fails validation never reaches the renderer. Generation retries with the validator error injected into the prompt (max 3 retries, then fall back to a simpler interaction type).

---

## 4. PEDAGOGY TEMPLATES (hand-built, the quality moat)

Templates map to **teaching interaction types, not subjects.** Five total; build in priority order.

### T1 — Cinematic Timeline (P0, hero demo #1: history)
- Sequential scenes, scripted camera choreography, date/title cards animating in.
- Student role: observer or light objective per phase (walk to X, examine Y).
- Camera move vocabulary the spec can invoke: `date_title_cinematic`, `crane_down_to_street`, `follow_actor`, `slow_motion_orbit`, `cutaway`, `first_person_walk`.
- Environments: modular street/interior kits assembled from asset library.

### T2 — Scale Journey (P0, hero demo #2: biology)
- First/third-person travel through something at impossible scale (inside a cell, through the solar system, inside a computer).
- Each phase = a "stop" (organelle, planet, component) with narration + talking NPC.
- This template carries the Live API NPC showcase: walk up to the mitochondria, ask "what are you?", get a grounded voice answer.

### T3 — Parameter Sandbox (P0, the LIVE generation demo: physics)
- Real physics via Rapier (rapier3d-compat). The LLM never invents physics; it maps slide content to scenario parameters (gravity, angle, mass, velocity, targets).
- Scenarios: projectile motion, pendulum, orbits, collisions, inclined plane.
- Student adjusts sliders → predicts outcome → runs sim → sees result. Predict-then-test is the pedagogy.
- **Fastest to generate (parameter filling only) → this is the one we generate LIVE on stage.**

### T4 — Assembly Puzzle (P1: chemistry)
- Drag atoms to build molecules; valence rules enforced in code so wrong bonds physically reject.
- Reaction phases: combine correct reactants to proceed.

### T5 — Dialogue Scene (P2: languages/social studies)
- Branching conversation with Live API NPCs (order food in French from an NPC waiter with affective audio).
- Only build if T1-T3 are done and polished.

**Template selection:** a Gemini 3.5 Flash classifier reads the beat list and picks the template. Teacher can override in the UI.

---

## 5. MODEL ROUTING TABLE (Vertex AI, $400 credits + $500 Tripo credits)

| Pipeline stage | Model | Why | Priority |
|---|---|---|---|
| Messy upload ingestion (scanned PDFs, photos of handouts) | **Mistral OCR** (GA on Vertex) | Robust extraction from real-teacher garbage inputs | P1 |
| Deck understanding + beat extraction | **Gemini 3.1 Pro** | 1M context, reads whole PDFs in one shot, top reasoning | P0 |
| Per-beat spec generation (parallel) | **Gemini 3.5 Flash** | Near-Pro quality at Flash cost/speed, parallel agentic execution | P0 |
| Fact-check agent w/ citations | **Gemini + Google Search grounding** | 5,000 free grounded prompts/month; attach source URLs per claim | P0 |
| Geo/history location pinning | **Grounding with Google Maps** | Pin scenes to real places (actual Sarajevo motorcade route) | P2 |
| Scene filling / any Three.js codegen | **Claude Sonnet 4.6 / Opus 4.6** (Model Garden) | Best Three.js generation available; also the multi-provider story | P0 |
| Age/safety check on every phase | **ShieldGemma 2** | Policy-based text+image safety evaluation; the "adjusted for grade level" demo moment | P0 |
| Consistent characters across scenes | **Gemini 3 Pro Image (Nano Banana Pro)** | Character consistency w/ up to 14 reference inputs; legible text rendering | P1 |
| Bulk textures/backdrops | **Gemini 3.1 Flash Image** | Cheap, fast image gen | P1 |
| Teacher-voice narration | **Chirp 3 Instant Custom Voice** | Custom voice from 10 seconds of audio. Killer demo moment. | P0 |
| Per-phase soundtrack | **Lyria 3 Clip** (30s) / **Lyria 3 Pro** (184s) | Mood-matched score per phase ("tense strings", "triumphant") | P1 |
| Lesson intro cutscene | **Veo 3.1 Lite** | Cheapest Veo; one cinematic intro per lesson, then hand off to interactive | P2 |
| Talking NPCs | **Gemini Live API (native audio)** | Proactive audio + affective dialog; grounded persona per NPC | P1 (biology game only) |
| 3D model generation | **Tripo AI** ($500 credits, outside Vertex) | History props: car, street furniture, stylized characters | P0 |
| Cost control | **Batch API** | 50% off async workloads; use for all pre-generation | P1 |

**Do NOT use:** Imagen 4 (developer endpoints discontinued June 2026; Google recommends Gemini image models). DeepSeek/Kimi/GLM/Qwen add nothing here; mention "multi-provider routing" in pitch only.

**Reference implementation to steal patterns from:** `GoogleCloudPlatform/vertex-ai-creative-studio` on GitHub (Gemini + Veo + Nano Banana + Chirp 3 HD + Gemini TTS + Lyria wired together with workflows).

---

## 6. TEACHER APP (UI)

**Look and feel:** Claude.ai / ChatGPT-style layout. Left sidebar (lessons list, console), main chat pane, right panel switches between game preview / review screens. Clean, calm, education-grade. Not gamer aesthetic.

### 6.1 Authoring flow
1. **Login** (Firebase Auth, Google sign-in; class code join for students, no student accounts needed for demo).
2. **Create lesson:** upload slideshow (PDF/PPTX/images) **or** just describe it in chat ("make me a grade 7 lesson on the water cycle"). Both paths converge on the same pipeline.
3. **Pipeline progress view:** live stage indicator (Reading deck → Extracting concepts → Fact-checking → Safety check → Building scenes → Generating assets). Each stage streams status into the chat. This visible pipeline IS the anti-wrapper argument, on screen.
4. **Review screen (P0, the defensibility centerpiece):**
   - Phase-by-phase cards: narration text, scene thumbnail, interaction type.
   - **Citations panel:** every factual claim with its source link, confidence, approve/edit/remove per claim.
   - **Safety panel:** ShieldGemma flags with the auto-adjustment shown ("student role changed from actor to bystander") and teacher approve/override.
   - Inline editing: click any narration/objective text to edit; changes write back to the spec.
5. **Iterative chat editing:** teacher keeps prompting ("make phase 3 shorter", "add a quiz after the archduke arrives", "the music is too intense"). Each request = a targeted spec mutation + re-render of affected phase only. Expose these as visible tool calls in the chat (age_check, fact_check, regenerate_phase, change_music, add_quiz) so the agentic-ness is on screen.
6. **Voice setup:** record 10 seconds → Chirp Instant Custom Voice → all narration re-rendered in teacher's voice. One-click toggle back to stock voice.
7. **Publish:** lesson gets a 6-character class code.

### 6.2 Live classroom mode (P0 — best idea in the project)
- Students go to site, enter class code on Chromebooks, land in the lesson lobby.
- **Teacher presenter view:** current phase, next/prev phase buttons, roster of connected students with per-student status (in-phase, completed objective, idle), **Pause All** (freezes every student's game with a "look up at your teacher" overlay), **Spotlight** (mirror one student's view to teacher screen), per-phase teacher notes (talking points shown only to teacher).
- **Phase sync mechanic:** teacher clicks Next → all student clients advance together. Students who finish a phase's objective early get a contained "explore" state, never the next phase. The teacher conducts; nobody runs ahead.
- **Sync implementation:** Firestore realtime listeners. `sessions/{code}` doc holds `currentPhase`, `paused`, `spotlightStudentId`. Students subscribe; ~50 lines. Telemetry events written to `sessions/{code}/events` subcollection.
- Optional teacher in-game powers (P2): teacher cursor/laser pointer visible in student scenes, teacher can trigger a scene event manually.

### 6.3 Analytics dashboard (P1, mock data acceptable for demo)
- Per-phase: completion time distribution, quiz correctness, replay count, NPC questions asked (the questions students ask NPCs are themselves a goldmine: "6 students asked what a trench is → reteach").
- Headline widget: "Your class struggled with Phase 4: The Alliances." 
- Demo with pre-seeded fake data; wire real telemetry only if time allows.

---

## 7. GAME RENDERER (student client)

- **Stack:** Three.js + rapier3d-compat, React shell, single SPA. Runs on Chromebooks → performance budget matters: target 30fps on low-end, cap pixel ratio, no post-processing beyond bloom, aggressive draco/meshopt compression on GLBs.
- Loads a Lesson Spec JSON + asset manifest, instantiates the named template, plays phases.
- **Interaction vocabulary** (what specs can request): move-to-point objective, examine object, quiz overlay (multiple choice), slider-driven sandbox params, NPC talk (hold to speak, Live API), timed sequence, cinematic (no input).
- **Quiz checkpoints:** phase can't complete until answered; wrong answers get a hint, telemetry logs attempts.
- **Audio:** narration track per phase (teacher voice), Lyria music bed with crossfade between phases, SFX from a free pack (Kenney.nl).
- **Visual bar:** "not horrible, always legible" for generated lessons; "stunning" for the two hero lessons. Good lighting + fog + color grading on primitives beats bad models. Every recognizability-critical object (mitochondria, the 1914 car) must be a proper sourced model.

---

## 8. ASSET STRATEGY

| Asset class | Source | Notes |
|---|---|---|
| Recognizability-critical (organelles, historical car, landmark buildings) | **Sketchfab CC-licensed models** | Textbook-accurate; download as GLB; attribute in credits screen |
| History scene props & stylized characters | **Tripo AI** ($500 credits) | Generate tonight, iterate on the hero scene: car, street kit, 3-4 characters |
| Pre-generated library | Existing library from earlier project + tonight's Tripo runs | Index by tag in a manifest JSON so the pipeline can "shop" it before generating new |
| Textures, backdrops, skyboxes | Gemini 3.1 Flash Image | Batch API for 50% off |
| Character portraits / consistent 2D art | Nano Banana Pro (up to 14 reference inputs) | Same Franz across all scenes |
| Filler geometry | Primitives + good lighting | Cheaper and often better-looking than bad models |
| Music | Lyria 3 Clip per phase | Generate from beat mood tags |
| Narration | Chirp 3 (teacher custom voice) | Pre-render all hero narration |
| SFX | Kenney.nl / freesound | Don't generate SFX, waste of time |

**Asset resolution order in the pipeline:** library manifest → Sketchfab tag list (pre-curated) → Tripo generation → primitive fallback. Never block a lesson on asset generation; ship with fallback and upgrade async.

---

## 9. HERO DEMOS AND THE LIVE GENERATION

### Hero lesson 1 — History: "Sarajevo, 1914" (Cinematic Timeline)
- 5-6 phases: title cinematic → street exploration w/ objective → the wrong turn (follow-actor camera) → **the safety-adjusted event phase** → aftermath/alliances → quiz checkpoint.
- **The safety showcase (planned demo moment):** the raw spec contains the assassination as a student-playable action. ShieldGemma flags it live on the review screen: "Adjusted for grade level: students witness the event as bystanders; camera handles the moment via cinematic cutaway. Student objective: navigate the crowd to warn the motorcade." Teacher approves. This one moment demos safety layer + teacher control + historical fidelity simultaneously.
- Full production: Tripo car + street, Lyria score, teacher-voice narration, one Live-API bystander NPC if time allows (otherwise NPCs live in biology only).

### Hero lesson 2 — Biology: "Journey Through the Cell" (Scale Journey)
- Student shrinks into a cell; stops at membrane → cytoplasm → mitochondria → nucleus → ribosomes.
- **Live API NPC showcase:** walk to the mitochondria, hold-to-talk, ask "what are you?" → grounded, affective voice answer in-character. Persona is fenced to lesson context; off-topic questions get deflected back ("Great question, but let's stay inside the cell!").
- Sourced Sketchfab organelle models. Must look like the textbook diagram, not blobs.

### Live generation — Physics: "Projectile Motion" (Parameter Sandbox)
- On stage: upload a real 5-slide physics deck → pipeline runs visibly → playable sandbox in under ~1 minute (parameter filling is genuinely fast).
- Proves the pipeline is real. This is what kills the "it's all pre-baked" question before it's asked.

### Demo integrity rule (non-negotiable)
Present hero lessons truthfully: **"These were generated in advance and then reviewed by the teacher, exactly like a real teacher preparing the night before. Heavy assets take minutes, not seconds."** Then run the live physics generation. Do not claim a false generation time for the hero lessons; judges will ask to see it live, and the honest framing (prepared lesson + live proof) is strictly stronger anyway. The "teacher prepares in advance" story is true to the product, so lean on it.

### Demo script (3 min)
1. (20s) Problem: slideshow fatigue, teacher loses the room.
2. (30s) Upload physics deck live, pipeline stages streaming on screen. Let it cook in background.
3. (60s) Open the prepared Sarajevo lesson: review screen → citations → the ShieldGemma adjustment moment → publish.
4. (40s) Classroom mode: two Chromebooks + phone as students, teacher clicks Next, all screens advance, Pause All, spotlight. Cell lesson: ask the mitochondria a question out loud.
5. (20s) Physics sandbox finished generating → play it live.
6. (10s) Analytics dashboard: "your class struggled with Phase 4."

---

## 10. FEATURE PRIORITIES

### P0 — must exist for the demo (build first)
- Lesson Spec schema + validator
- Pipeline: ingest (PDF) → beats → template classification → spec gen → grounding w/ citations → ShieldGemma check → scene fill
- Templates T1 (cinematic), T2 (scale journey), T3 (sandbox)
- Renderer: phase playback, objectives, quiz overlay
- Teacher UI: chat console, upload, pipeline progress view, review screen (citations + safety), publish w/ class code
- Classroom sync: phase control, Pause All, roster
- Chirp custom teacher voice
- Hero lessons 1 & 2 fully produced; physics live-gen path tested repeatedly
- Tripo hero assets + Sketchfab organelles

### P1 — build if on schedule
- Live API NPC in biology lesson (high value, medium risk — timebox it)
- Iterative chat editing w/ visible tool calls
- Lyria per-phase music
- Nano Banana Pro consistent characters
- Mistral OCR messy-input path
- Analytics dashboard (mock data)
- Spotlight student view
- Telemetry event capture (real)

### P2 — bonus / mention-in-pitch only
- Veo 3.1 Lite intro cutscenes
- T4 assembly puzzle (chemistry), T5 dialogue (languages)
- Grounding with Google Maps (real Sarajevo route)
- Teacher in-game powers (laser pointer, trigger events)
- Conversational lesson creation with zero slides (works via same pipeline; demo only if stable)
- Batch API cost optimization
- Multi-language narration (Chirp)

### Explicitly cut (mention as roadmap if asked)
- Student accounts/auth, grading integration (LMS), mobile apps, multi-classroom orgs, T5 unless miracle, real-time multiplayer physics interactions between students, editing hero lesson visuals from chat.

---

## 11. TECH STACK

- **Frontend:** Next.js + React + Tailwind. Two routes: `/teach` (teacher app) and `/play/{code}` (student client).
- **3D:** Three.js (vanilla, not R3F, for template control) + rapier3d-compat. GLB assets, draco-compressed.
- **Realtime + data:** Firebase — Auth, Firestore (sessions, specs, telemetry), Storage (assets), Hosting.
- **Pipeline:** Node or Python service (Cloud Run or just run locally for the hackathon) calling Vertex AI. All Vertex calls through the OpenAPI-compatible endpoints; Claude via Model Garden MaaS. Service-account auth (MaaS models require GCP auth, no API keys).
- **Asset pipeline:** Tripo API + Sketchfab downloads → gltf-transform for compression → Storage → manifest JSON.
- **Repo layout:**
```
/apps/teacher      Next.js teacher app
/apps/student      student client + renderer + templates
/packages/spec     JSON schema, zod types, validator (shared)
/services/pipeline generation service (Vertex calls, staged)
/assets            manifest.json + GLBs + audio
```

---

## 12. TEAM DELEGATION (4 people)

**Person A — Teacher App + Classroom Sync**
Chat console UI, upload flow, pipeline progress view, review screen (citations + safety panels), publish/class-code, presenter view, Firestore sync, roster, Pause All. Owns the demo laptop experience. Mocks the pipeline with a canned spec JSON on day one so UI never blocks on Person B.

**Person B — Pipeline + Spec + Model Integrations**
Owns the Lesson Spec schema (freeze it EARLY, within the first 2 hours, with A/C/D at the table). Builds ingest → beats → classify → generate → ground → ShieldGemma → scene fill. Wires Chirp custom voice, Lyria, Nano Banana, Mistral OCR, Claude-on-Vertex. Owns the live physics generation path and rehearses it 10+ times. This person answers the architecture questions in judging.

**Person C — Hero Game 1: History (Template T1)**
Builds the cinematic timeline template generically FIRST (spec-driven), then art-directs the Sarajevo lesson on top of it: Tripo assets, lighting, camera choreography, the safety-adjusted phase, Lyria/Chirp audio integration. Quality bar: stunning.

**Person D — Hero Game 2: Biology (Template T2) + Sandbox (T3)**
Scale journey template + cell lesson with Sketchfab organelles. Owns Live API NPC integration (timeboxed: if it fights back for >3 hours, ship text-bubble NPCs with pre-grounded answers and move on). Also builds T3 sandbox template (it's the simplest one) so the live-gen demo has a target.

**Shared contract:** the Lesson Spec schema is the API between all four people. Freeze v1 in hour 2. Any change after that requires all four to agree. Person A and C/D develop against fixture spec files in `/packages/spec/fixtures/` from the start.

**Suggested sequence (adapt to hours remaining):**
1. **Hours 0-2:** all four design + freeze spec schema v1; A scaffolds apps; B scaffolds pipeline with hardcoded outputs; C/D scaffold templates with fixture specs.
2. **First third:** A ships upload→progress→review with mock data; B gets real end-to-end pipeline on the physics deck; C/D get templates playing fixture specs with placeholder assets.
3. **Second third:** real pipeline output flows into templates; Tripo/Sketchfab assets land; Chirp voice + sync mode working; hero lessons take shape.
4. **Final third:** polish hero lessons, rehearse live physics gen repeatedly, record backup video of everything (mandatory), analytics mock, pitch prep, sleep in shifts.
5. **Backup plan:** screen-record every working flow the moment it works. Demo gods are cruel.

---

## 13. JUDGE Q&A PREP

- **"Isn't this just Claude Code with extra steps?"** → Spec-first IR, hand-built templates, grounded citations with teacher review, classroom sync, telemetry. Claude Code gives you one unverified file; we give a reviewable system. (Then show the review screen.)
- **"How do you know it's accurate?"** → Search-grounded fact-check per claim, citations surfaced, teacher approves. Nothing unreviewed reaches students.
- **"What about inappropriate content?"** → ShieldGemma pass on every phase + the grade-level adjustment flow. Show the Franz Ferdinand adjustment.
- **"Does the teacher lose the classroom?"** → Phase sync. Teacher conducts; students literally cannot run ahead. Pause All.
- **"Was that pre-made?"** → "The hero lessons were generated in advance and teacher-reviewed, exactly like real lesson prep. Here's one generating live right now." (Physics.)
- **"Business model?"** (if asked) → per-teacher SaaS, school-site licenses; content library network effects (teachers share reviewed lessons).

---

## 14. RISKS AND MITIGATIONS

| Risk | Mitigation |
|---|---|
| Live API NPC integration eats a person | Hard 3-hour timebox → fallback to text NPCs with pre-grounded answers |
| Live physics gen fails on stage | Rehearse 10+ times; cache a known-good deck; backup video |
| Chromebook performance | 30fps budget, compressed GLBs, no heavy postprocessing, test on the worst laptop you own |
| Spec schema churn breaks everyone | Freeze in hour 2; versioned fixtures |
| Vertex quota/latency surprises | Test every model call in hour 1; Batch API only for pre-gen, never for live path |
| Team burns time on T4/T5 | They are P2; do not touch until heroes are stunning |
| Asset licensing questions | CC-attribution screen in credits; SynthID watermarking is built into Google gen models by default |

---

*End of spec. Feed sections 2-8 + 11 to Claude Code as the build brief; keep 9-10 + 12-14 as the team's operating doc.*
