// Narration playback. Prefers pre-rendered Chirp voice MP3s (from
// tools/gen-narration.mjs); falls back to the browser SpeechSynthesis API when
// a phase has no audio file. One module owns muting/stopping for both paths.

let muted = false;
let preferredVoice = null;
let manifest = { narration: {} };
let currentAudio = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (!voices.length) return null;
  const byName = (n) => voices.find((v) => v.name.toLowerCase().includes(n));
  return (
    byName('daniel') || byName('google uk english male') || byName('google us english') ||
    voices.find((v) => v.lang?.startsWith('en')) || voices[0]
  );
}

export async function initNarration() {
  if ('speechSynthesis' in window) {
    preferredVoice = pickVoice();
    window.speechSynthesis.onvoiceschanged = () => { preferredVoice = pickVoice(); };
  }
  try {
    const m = await fetch('/assets/narration-manifest.json').then((r) => (r.ok ? r.json() : null));
    if (m?.narration) manifest = m;
  } catch { /* no manifest — TTS only */ }
}

// Play a phase's narration: MP3 if we have one, else spoken TTS.
export function playNarration(phaseId, text, { onEnd } = {}) {
  stopNarration();
  if (muted) { onEnd?.(); return; }

  const file = manifest.narration?.[phaseId];
  if (file) {
    const audio = new Audio('/' + file.replace(/^\//, ''));
    currentAudio = audio;
    audio.onended = () => { if (currentAudio === audio) currentAudio = null; onEnd?.(); };
    audio.play().catch(() => speak(text, { onEnd })); // autoplay blocked -> TTS
    return;
  }
  speak(text, { onEnd });
}

export function speak(text, { onEnd } = {}) {
  if (muted || !('speechSynthesis' in window) || !text) { onEnd?.(); return; }
  const u = new SpeechSynthesisUtterance(text);
  if (preferredVoice) u.voice = preferredVoice;
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopNarration() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function pauseNarration() {
  if (currentAudio) currentAudio.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.pause();
}

export function resumeNarration() {
  if (currentAudio) currentAudio.play().catch(() => {});
  if ('speechSynthesis' in window) window.speechSynthesis.resume();
}

export function setMuted(value) {
  muted = value;
  if (muted) stopNarration();
}

export function isMuted() { return muted; }
