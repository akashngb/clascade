// Narration via the browser SpeechSynthesis API.
// Stand-in for the Chirp custom teacher voice used in the full product — lets
// the lesson talk with zero audio assets. Swap this module for real MP3
// playback (spec: narration.audioAsset) without touching the rest of the game.

let muted = false;
let currentUtterance = null;
let preferredVoice = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (!voices.length) return null;
  // Prefer a natural-sounding English voice; fall back to first English, then first.
  const byName = (n) => voices.find((v) => v.name.toLowerCase().includes(n));
  return (
    byName('daniel') ||
    byName('google uk english male') ||
    byName('google us english') ||
    voices.find((v) => v.lang?.startsWith('en')) ||
    voices[0]
  );
}

export function initNarration() {
  if (!('speechSynthesis' in window)) return;
  preferredVoice = pickVoice();
  // Voices load async in some browsers.
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = pickVoice();
  };
}

export function speak(text, { onEnd } = {}) {
  stopNarration();
  if (muted || !('speechSynthesis' in window) || !text) {
    onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  if (preferredVoice) u.voice = preferredVoice;
  u.rate = 0.95;
  u.pitch = 1.0;
  u.onend = () => {
    if (currentUtterance === u) currentUtterance = null;
    onEnd?.();
  };
  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

export function stopNarration() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function setMuted(value) {
  muted = value;
  if (muted) stopNarration();
}

export function isMuted() {
  return muted;
}
