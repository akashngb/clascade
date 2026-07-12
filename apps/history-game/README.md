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

## Assets (server-side generation)

Model/audio/texture binaries are **not** committed (see root `.gitignore`) —
regenerate them from the manifests. All scripts read keys from the gitignored
repo-root `.env` (copy `.env.example`) and keep them server-side; only static
files reach the client.

```bash
node tools/fetch-assets.mjs    # CC 3D models from Poly Pizza -> public/assets/models/
node tools/gen-narration.mjs   # Chirp 3 voice per phase     -> public/assets/audio/narration/
node tools/gen-music.mjs       # Lyria mood beds per phase    -> public/assets/audio/music/
node tools/gen-textures.mjs    # Gemini sky + cobblestone     -> public/assets/textures/
```

Each writes a `*-manifest.json` (committed) that the renderer "shops"; every
asset has a primitive / browser-TTS fallback, so the game runs even with no
generated assets. Models are CC-licensed — attributions live in the manifest.

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
| `src/AssetLoader.js` | Loads/normalizes GLBs + textures from the manifests |
| `src/narration.js` | Chirp voice MP3 playback, browser-TTS fallback |
| `src/music.js` | Per-phase Lyria beds with crossfade |
| `tools/` | Server-side asset generators (Poly Pizza, Chirp, Lyria, Gemini) |
| `public/sarajevo-1914.json` | The Lesson Spec fixture this build renders |
