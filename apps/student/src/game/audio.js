// Tiny procedural audio: footsteps synthesized with WebAudio so we ship zero
// sound assets. The context is created lazily on the first step, which happens
// after the pointer-lock click, so the browser autoplay policy is satisfied.
let ctx = null;
let noiseBuffer = null;

function getContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function getNoiseBuffer(c) {
  if (!noiseBuffer) {
    const len = Math.floor(c.sampleRate * 0.1);
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

// A short filtered noise burst — reads as a soft footstep on a hard lab floor.
export function playFootstep({ sprint = false } = {}) {
  const c = getContext();
  if (!c || c.state !== 'running') return;

  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = getNoiseBuffer(c);
  src.playbackRate.value = 0.85 + Math.random() * 0.3;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = sprint ? 900 : 650;
  filter.Q.value = 0.8;

  const gain = c.createGain();
  const peak = (sprint ? 0.09 : 0.06) * (0.85 + Math.random() * 0.3);
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + 0.1);
}

// ---------------------------------------------------------------------------
// SFX + ambient — sampled clips (Kenney CC0: Interface Sounds, Sci-Fi Sounds,
// Music Jingles), in /public/assets/audio. Footsteps stay procedural above;
// these are the discrete gameplay cues. The lesson event bus (useLesson.emit)
// is the single choke point that drives them, so the renderer stays untouched.
// ---------------------------------------------------------------------------

const SFX_BASE = '/assets/audio';

// One-shot cues and their volumes (0–1), kept modest so narration sits on top.
const SFX = {
  lesson_start: { file: 'lesson_start.ogg', volume: 0.5 },
  door_open: { file: 'door_open.ogg', volume: 0.45 },
  base_collect: { file: 'base_collect.ogg', volume: 0.6 }, // glassy clink — the vials are glass
  pair_correct: { file: 'pair_correct.ogg', volume: 0.55 },
  pair_wrong: { file: 'pair_wrong.ogg', volume: 0.4 },
  lesson_complete: { file: 'lesson_complete.ogg', volume: 0.6 },
  ui_click: { file: 'ui_click.ogg', volume: 0.35 },
};

// Which cue each lesson event fires. Events absent here are silent.
const EVENT_SOUND = {
  lesson_start: 'lesson_start',
  phase_enter: 'door_open', // walking into the next (now-unlocked) room
  base_identified: 'base_collect',
  pair_correct: 'pair_correct',
  pair_wrong: 'pair_wrong',
  lesson_complete: 'lesson_complete',
};

const canPlayFiles = typeof window !== 'undefined' && typeof Audio !== 'undefined';
const MUTE_KEY = 'sq_muted';
const AMBIENT_VOLUME = 0.18;

let muted = canPlayFiles && window.localStorage?.getItem(MUTE_KEY) === '1';
let ambient = null;
const clipCache = new Map();

function baseClip(name) {
  const spec = SFX[name];
  if (!spec) return null;
  if (!clipCache.has(name)) {
    const el = new Audio(`${SFX_BASE}/${spec.file}`);
    el.preload = 'auto';
    clipCache.set(name, el);
  }
  return clipCache.get(name);
}

// Play a one-shot cue. Cloning lets the same sound overlap itself (rapid correct
// answers) instead of restarting. Autoplay rejections before the first gesture
// are swallowed — the first real sound is lesson_start, fired from a click.
export function playSound(name) {
  if (!canPlayFiles || muted) return;
  const spec = SFX[name];
  const base = baseClip(name);
  if (!base || !spec) return;
  const el = base.cloneNode();
  el.volume = spec.volume;
  el.play().catch(() => {});
}

// Route a lesson event to its cue, and manage the ambient bed's lifecycle.
export function playEvent(event) {
  if (event === 'lesson_start') startAmbient();
  if (event === 'lesson_complete') stopAmbient();
  const sound = EVENT_SOUND[event];
  if (sound) playSound(sound);
}

// Low looping lab hum. Started on lesson_start (a user gesture) so autoplay is
// allowed; stopped when the lesson finishes.
export function startAmbient() {
  if (!canPlayFiles || ambient) return;
  ambient = new Audio(`${SFX_BASE}/ambient_lab.ogg`);
  ambient.loop = true;
  ambient.volume = muted ? 0 : AMBIENT_VOLUME;
  ambient.play().catch(() => {});
}

export function stopAmbient() {
  if (ambient) {
    ambient.pause();
    ambient = null;
  }
}

export function isMuted() {
  return muted;
}

// Toggle all sampled audio; returns the new state so a UI control can reflect it.
export function setMuted(next) {
  muted = next;
  if (canPlayFiles) window.localStorage?.setItem(MUTE_KEY, next ? '1' : '0');
  if (ambient) ambient.volume = next ? 0 : AMBIENT_VOLUME;
  return muted;
}
