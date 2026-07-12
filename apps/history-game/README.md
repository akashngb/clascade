# History Game — Cinematic Timeline (T1)

Owner: Omar. The **Cinematic Timeline** pedagogy template plus the hero lesson
**"Sarajevo, 1914: The Spark."**

The renderer is spec-driven: it reads a Lesson Spec JSON (`public/sarajevo-1914.json`)
and plays it phase by phase. Nothing about Sarajevo is hardcoded in the template —
swap the spec and the same engine renders a different cinematic-timeline lesson.

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5173.

## Controls

- **Teacher bar (bottom):** Prev / Next phase, Pause, mute narration.
- **Walking phases:** `W A S D` / arrow keys to move, drag mouse to look, `E` to interact.

## Structure

| File | Role |
|---|---|
| `src/main.js` | Boot: load spec, build game, start loop |
| `src/game.js` | Scene, renderer, camera, render loop |
| `src/CameraDirector.js` | The 6 cinematic camera moves |
| `src/PhaseController.js` | Sequences phases, wires interactions |
| `src/environments.js` | Grey-box world builders (street, alliance map, quiz room) |
| `src/FirstPersonControls.js` | Walk + look for objective phases |
| `src/ui.js` | Title cards, narration subtitles, objectives, quiz, teacher bar |
| `src/narration.js` | Browser TTS narration (stand-in for Chirp voice) |
| `public/sarajevo-1914.json` | The Lesson Spec fixture this build renders |
