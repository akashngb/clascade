# Live classroom sync — teacher controls the phase, students follow

When a teacher advances a phase, every joined student's screen advances with them
(and pauses when the teacher pauses). Works with any embedded game that speaks the
renderer protocol — the Sarajevo history game is wired up as the default.

## Try it locally

```bash
npm install
npm run dev
```

- Teacher: open **`/present/ROOM1`** (any code). Use ← / → (or the on-screen
  buttons) to change phase, space to pause.
- Students: open **`/live/ROOM1`** in other tabs/devices, enter a name.
- Advancing the teacher moves every student within ~1 second.

## How it works

```
Teacher (/present/CODE)                Student (/live/CODE)
  │ ← / → / pause                          │  polls GET /api/sessions/CODE (~1s)
  ▼                                        ▼
  PATCH /api/sessions/CODE  ──►  shared session store  ──►  { currentPhase, paused }
  { currentPhase, paused }         (KV or in-memory)              │
                                                                  ▼
                                          iframe.postMessage({type:'set-phase'|'set-paused'})
                                                                  ▼
                                          game bridge → controller.goToPhase(n)
```

- **Source of truth:** `src/lib/session-store.ts` — one `ClassroomSession`
  `{ code, currentPhase, paused, phaseCount, renderer }` per class code.
- **API:** `GET/PATCH /api/sessions/[code]` — students read, the teacher writes.
- **Transport:** polling (1s). Simple and serverless-safe; swap for SSE/WebSocket
  later if you want sub-second latency.
- **Renderer bridge:** `src/lib/renderer-protocol.ts` + `src/components/renderer-frame.tsx`
  drive the embedded game by `postMessage`. Any game opts in — see the reference
  implementation in `public/renderer/stub/index.html` and the real one in
  `apps/history-game/src/embed-bridge.js`.

## Renderer protocol (to make another game teacher-drivable)

Console → game:  `{ source: 'clascade', type: 'set-phase', phaseIndex }`,
`{ …, type: 'set-paused', paused }`, `{ …, type: 'hello' }`
Game → console:  `{ source: 'clascade-renderer', type: 'ready', phaseCount }`,
`{ …, type: 'phase', phaseIndex }`

The game reads `?embed=1` to hide its own phase controls and let the console drive.

## Production (IMPORTANT)

On serverless (Vercel/Netlify) each request can hit a different instance, so the
in-memory fallback will desync teacher and students. Connect a durable store —
**Vercel KV** or **Upstash Redis** (both use the same REST API):

```
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

With those set, sync survives cold starts and scales across instances. On a single
always-on Node host (Render/Railway/a VM) the in-memory store also works.

The Sarajevo renderer is prebuilt into `public/renderer/sarajevo/` (static), so it
ships with the same deploy — no separate host needed. Rebuild it with:

```bash
cd apps/history-game && npm install && npm run build
cp -r dist/* ../../public/renderer/sarajevo/
```
