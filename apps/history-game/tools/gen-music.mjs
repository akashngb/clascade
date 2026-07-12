import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, APP_ROOT } from './lib/env.mjs';
import { getAccessToken } from './lib/gcp-auth.mjs';

// Pre-generate a per-phase music bed with Lyria (Vertex) into
// public/assets/audio/music/. Each phase's mood tag drives a richer prompt.
// Lyria returns ~30s 48kHz WAV clips; the game loops them with crossfade.

loadEnv();
const PROJECT = process.env.GCP_PROJECT;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const MODEL = process.env.LYRIA_MODEL || 'lyria-002';

const SPEC = path.join(APP_ROOT, 'public/sarajevo-1914.json');
const OUT_DIR = path.join(APP_ROOT, 'public/assets/audio/music');
const MANIFEST = path.join(APP_ROOT, 'public/assets/music-manifest.json');

// Mood tag -> generation prompt.
const MOOD_PROMPTS = {
  tense_strings: 'slow tense orchestral strings, ominous and cinematic, minor key, sustained, no percussion',
  uneasy_ambient: 'uneasy ambient orchestral drone, soft unsettling strings, sparse, quiet tension',
  rising_tension: 'rising orchestral tension, accelerating tremolo strings, building suspense, cinematic, no drums',
  held_breath: 'very quiet suspended strings, a single held breathless note, minimal, fragile tension',
  somber_swell: 'somber orchestral swell, mournful strings and low brass, elegiac and slow, reflective',
  neutral_calm: 'calm gentle ambient pads, soft and neutral, reflective and quiet',
};

async function generate(prompt, token) {
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt, negative_prompt: 'vocals, singing, lyrics, spoken word' }],
      parameters: { sampleCount: 1 },
    }),
  });
  if (!res.ok) throw new Error(`predict -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const pred = json.predictions?.[0];
  const b64 = pred?.bytesBase64Encoded || pred?.audioContent;
  if (!b64) throw new Error(`no audio in prediction: ${JSON.stringify(pred).slice(0, 200)}`);
  return Buffer.from(b64, 'base64');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
  const token = await getAccessToken();
  const manifest = { model: MODEL, generatedAt: new Date().toISOString(), music: {} };

  for (const phase of spec.phases) {
    const mood = phase.scene?.music?.mood;
    const prompt = MOOD_PROMPTS[mood] || 'calm cinematic ambient score, orchestral, quiet';
    try {
      const wav = await generate(prompt, token);
      const file = `${phase.phaseId}.wav`;
      fs.writeFileSync(path.join(OUT_DIR, file), wav);
      manifest.music[phase.phaseId] = `assets/audio/music/${file}`;
      console.log(`  -> ${file} (${(wav.length / 1024 / 1024).toFixed(1)} MB) [${mood}]`);
    } catch (e) {
      console.log(`  [error] ${phase.phaseId} (${mood}): ${e.message}`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nModel: ${MODEL}\nManifest: ${MANIFEST}`);
}

main();
