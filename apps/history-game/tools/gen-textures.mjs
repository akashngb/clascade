import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, APP_ROOT } from './lib/env.mjs';
import { getAccessToken } from './lib/gcp-auth.mjs';

// Generate backdrop/texture images with Gemini image (Nano Banana) into
// public/assets/textures/. Kept to high-ROI, low-risk images: a period sky
// backdrop and a tileable cobblestone ground.

loadEnv();
const PROJECT = process.env.GCP_PROJECT;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const MODEL = process.env.IMAGE_MODEL || 'gemini-2.5-flash-image';

const OUT_DIR = path.join(APP_ROOT, 'public/assets/textures');
const MANIFEST = path.join(APP_ROOT, 'public/assets/textures-manifest.json');

const TEXTURES = [
  { slot: 'sky', prompt: 'A wide cinematic early-morning sky over an old European city in 1914, soft warm hazy sunlight breaking through, pale blue graduating to gold near the horizon, thin wispy clouds, atmospheric and photographic, no buildings, no text.' },
  { slot: 'cobblestone', prompt: 'A seamless tileable top-down texture of an old worn cobblestone street, grey and brown weathered stones, slightly damp from morning, even lighting, high detail, photographic, no shadows cast, no objects, no text.' },
];

async function genImage(prompt, token) {
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!res.ok) throw new Error(`generateContent -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error('no image part in response');
  return { data: Buffer.from(img.inlineData.data, 'base64'), mime: img.inlineData.mimeType || 'image/png' };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const token = await getAccessToken();
  const manifest = { model: MODEL, generatedAt: new Date().toISOString(), textures: {} };

  for (const t of TEXTURES) {
    try {
      const { data, mime } = await genImage(t.prompt, token);
      const ext = mime.includes('jpeg') ? 'jpg' : 'png';
      const file = `${t.slot}.${ext}`;
      fs.writeFileSync(path.join(OUT_DIR, file), data);
      manifest.textures[t.slot] = `assets/textures/${file}`;
      console.log(`  -> ${file} (${(data.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log(`  [error] ${t.slot}: ${e.message}`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nModel: ${MODEL}\nManifest: ${MANIFEST}`);
}

main();
