// Clascade embed bridge.
//
// When the game runs standalone, the teacher bar at the bottom drives phases.
// When it runs inside the Clascade console iframe (?embed=1), the *console*
// (teacher) drives phases over postMessage and every student mirrors them — so
// we hide the game's own teacher bar / chapter rail / start gate and listen for
// commands instead. Protocol mirrors src/lib/renderer-protocol.ts in the console.

const MSG_IN = 'clascade'; // console → game
const MSG_OUT = 'clascade-renderer'; // game → console

export function isEmbedded() {
  try {
    return new URLSearchParams(location.search).get('embed') === '1';
  } catch {
    return false;
  }
}

// handlers: { phaseCount, goToPhase(n), setPaused(bool), start() }
export function attachEmbedBridge(handlers) {
  const { phaseCount, goToPhase, setPaused, start } = handlers;

  // Hide the game's own presentation chrome — the console owns pacing now.
  for (const id of ['teacherbar', 'rail', 'start']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  document.body.classList.add('clascade-embed');

  const post = (type, extra) =>
    parent.postMessage(Object.assign({ source: MSG_OUT, type }, extra || {}), '*');

  let started = false;
  const ensureStarted = () => {
    if (!started) {
      started = true;
      start();
    }
  };

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== MSG_IN) return;
    if (data.type === 'set-phase') {
      ensureStarted();
      const n = Math.max(0, Math.min(phaseCount - 1, data.phaseIndex | 0));
      goToPhase(n);
      post('phase', { phaseIndex: n });
    } else if (data.type === 'set-paused') {
      setPaused(!!data.paused);
    } else if (data.type === 'hello') {
      post('ready', { phaseCount });
    }
  });

  // Announce readiness (covers parent-already-listening and parent-asks-hello).
  post('ready', { phaseCount });
}
