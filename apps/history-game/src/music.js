// Per-phase music beds (Lyria). Loops each phase's clip and crossfades on
// phase change. Independent of narration but muted/paused by the same controls.

let manifest = { music: {} };
let current = null;         // { audio, phaseId }
const TARGET = 0.3;
const FADE_MS = 900;
let muted = false;

export async function initMusic() {
  try {
    const m = await fetch('/assets/music-manifest.json').then((r) => (r.ok ? r.json() : null));
    if (m?.music) manifest = m;
  } catch { /* no music */ }
}

function ramp(audio, to, ms, onDone) {
  const from = audio.volume;
  const start = performance.now();
  const step = () => {
    const t = Math.min((performance.now() - start) / ms, 1);
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  };
  requestAnimationFrame(step);
}

export function playPhaseMusic(phaseId) {
  const file = manifest.music?.[phaseId];

  // Fade out and stop whatever is playing.
  if (current) {
    const old = current.audio;
    if (current.phaseId === phaseId) return; // already on this bed
    ramp(old, 0, FADE_MS, () => old.pause());
    current = null;
  }
  if (!file || muted) return;

  const audio = new Audio('/' + file.replace(/^\//, ''));
  audio.loop = true;
  audio.volume = 0;
  audio.play().then(() => ramp(audio, TARGET, FADE_MS)).catch(() => {});
  current = { audio, phaseId };
}

export function setMusicMuted(value) {
  muted = value;
  if (!current) return;
  if (muted) ramp(current.audio, 0, 300, () => current && current.audio.pause());
  else { current.audio.play().catch(() => {}); ramp(current.audio, TARGET, 400); }
}

export function pauseMusic() { current?.audio.pause(); }
export function resumeMusic() { if (!muted) current?.audio.play().catch(() => {}); }
export function stopMusic() {
  if (current) { current.audio.pause(); current = null; }
}
