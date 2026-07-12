# SlideQuest — Student Client (Biology Hero Demo)

Turns a DNA-transcription slideshow into a **walkable first-person 3D adventure**.
Built with **React + Three.js (React Three Fiber)**. This is hero lesson #2 from
the project brief (CLAUDE.md §9): *Journey Through the Gene*.

You spawn inside a **research lab** and walk around (mouse-look + WASD). A large
glass containment capsule in the center holds the real DNA specimen (a GLB
model); locked side capsules (cell, protein, phage) advertise future lessons.
Objectives are physical: walk up to glowing sample vials to collect the four
bases, step up to the analysis terminal to pair bases and build mRNA. Nobody
sits through slides — they explore.

## Run it

```bash
cd apps/student
npm install
npm run dev        # opens http://localhost:5174
```

## What it does

A walkable journey through DNA transcription. Each slide from the teacher's deck
becomes an objective you complete by moving through the world:

1. **Welcome to the Lab** — get your bearings; walk toward the DNA capsule.
2. **The Four Bases** — walk up to the 4 glowing sample vials to collect A/T/C/G.
3. **Base Pairing Rules** — reach the analysis terminal; match A–T and C–G to seal each rung.
4. **Transcription** — the terminal projects a hologram; build the mRNA strand (A→U).
5. **The Message Leaves** — recap.

**Controls:** click to look (pointer lock), `W A S D` / arrows to move, `Esc` to
release the mouse. See `src/lessons/sourceSlides.md` for the slide → phase mapping.

## Architecture (spec-first, per CLAUDE.md)

The renderer never hard-codes lesson content. Everything is driven by a **Lesson
Spec**: `src/lessons/dnaTranscription.js`. Swap that file and the same engine
plays a different lesson.

```
src/
├── lessons/
│   ├── dnaTranscription.js   # the Lesson Spec (IR) — phases, bases, pairing rules
│   └── sourceSlides.md       # the fake teacher deck this was "generated" from
├── game/
│   ├── useLesson.js          # phase state machine + interaction progress + telemetry hooks
│   ├── useKeyboard.js        # held-key tracking for movement
│   ├── playerState.js        # shared mutable player position (no re-renders)
│   ├── worldConfig.js        # world layout: helix size, pedestals, console, ranges
│   └── scene/
│       ├── Scene.jsx         # Canvas, lights, fog, bloom; Suspense-loads the lab
│       ├── Lab.jsx           # the room: floor, walls, ceiling lights, capsules, vials, terminal
│       ├── Capsule.jsx       # reusable glass containment capsule (holds a specimen)
│       ├── DnaSpecimen.jsx   # loads the real dna_helix.glb, recenters + scales it
│       ├── PlaceholderSpecimen.jsx # procedural cell / protein / phage for locked capsules
│       ├── SampleVial.jsx    # a base-sample vial you walk up to and collect
│       ├── AnalysisTerminal.jsx # the terminal + holographic building helix
│       ├── Player.jsx        # first-person controller (pointer lock + WASD + room/capsule collision)
│       ├── InteractionManager.jsx # proximity checks (collect vials / reach terminal)
│       ├── DnaHelix.jsx      # procedural helix — used as the terminal hologram
│       ├── Nucleotide.jsx    # a base "bead"
│       ├── Bond.jsx          # backbone / rung cylinder
│       ├── RnaPolymerase.jsx # the transcription enzyme
│       ├── Environment.jsx   # drifting motes (available; unused in lab)
│       └── geometry.js       # helix math helpers
└── ui/
    ├── Hud.jsx               # crosshair, control hint, quest tracker, prompts, nav
    ├── BasePairing.jsx       # the matching mini-game (p3 + p4)
    ├── StationPanel.jsx      # console modal that opens when you reach the lectern
    └── Overlays.jsx          # intro + finish cards
```

## Placeholders → real assets

Every 3D object is a **procedural placeholder** so the game looks clean and runs
with zero downloads. Upgrade visuals by dropping GLB/audio into
`public/assets/` — see `public/assets/README.md` and `manifest.json`. Components
that expect an asset upgrade are marked with `// Placeholder for now` comments.

Biology accuracy (base-pairing, A→U in transcription) is enforced in code
(`PAIRING` in the spec), so wrong answers are physically rejected.
