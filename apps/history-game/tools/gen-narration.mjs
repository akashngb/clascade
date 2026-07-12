import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, APP_ROOT } from './lib/env.mjs';
import { getAccessToken } from './lib/gcp-auth.mjs';

// Pre-render per-phase narration with a Chirp 3 HD voice (Cloud Text-to-Speech)
// into public/assets/audio/narration/. Stand-in for the teacher's custom voice;
// the game plays these MP3s and falls back to browser TTS when absent.

loadEnv();

const VOICE = process.env.NARRATION_VOICE || 'en-US-Chirp3-HD-Charon';
const SPEC = path.join(APP_ROOT, 'public/sarajevo-1914.json');
const OUT_DIR = path.join(APP_ROOT, 'public/assets/audio/narration');
const MANIFEST = path.join(APP_ROOT, 'public/assets/narration-manifest.json');

async function synth(text, token) {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'en-US', name: VOICE },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  if (!res.ok) throw new Error(`synthesize -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return Buffer.from(json.audioContent, 'base64');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
  const token = await getAccessToken();
  const manifest = { voice: VOICE, generatedAt: new Date().toISOString(), narration: {} };

  for (const phase of spec.phases) {
    const text = phase.narration?.text;
    if (!text) continue;
    try {
      const mp3 = await synth(text, token);
      const file = `${phase.phaseId}.mp3`;
      fs.writeFileSync(path.join(OUT_DIR, file), mp3);
      manifest.narration[phase.phaseId] = `assets/audio/narration/${file}`;
      console.log(`  -> ${file} (${(mp3.length / 1024).toFixed(0)} KB) "${phase.beatTitle}"`);
    } catch (e) {
      console.log(`  [error] ${phase.phaseId}: ${e.message}`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nVoice: ${VOICE}`);
  console.log(`Manifest: ${MANIFEST}`);
}

main();
