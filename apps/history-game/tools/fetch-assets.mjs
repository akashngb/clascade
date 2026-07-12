import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, APP_ROOT } from './lib/env.mjs';

// Pull CC-licensed GLB models from Poly Pizza into public/assets/models/ and
// write a manifest the renderer "shops" before falling back to primitives.
// Free API — safe to re-run. Keys stay server-side; only the GLBs ship.

loadEnv();
const KEY = process.env.POLY_PIZZA_API_KEY;
if (!KEY) throw new Error('POLY_PIZZA_API_KEY missing');

const OUT_DIR = path.join(APP_ROOT, 'public/assets/models');
const MANIFEST = path.join(APP_ROOT, 'public/assets/manifest.json');

// slot -> search query. First result is taken; override index if a pick is bad.
const WANTED = [
  { slot: 'car', query: 'vintage car', index: 0, note: 'motorcade — recognizability-critical' },
  { slot: 'lamp', query: 'street lamp', index: 0 },
  { slot: 'bench', query: 'bench', index: 0 },
  { slot: 'tree', query: 'tree', index: 0 },
  { slot: 'barrel', query: 'barrel', index: 0 },
  { slot: 'crate', query: 'wooden crate', index: 0 },
  { slot: 'person1', query: 'low poly person', index: 0, note: 'crowd figure — Man' },
  { slot: 'person2', query: 'man standing', index: 2, note: 'crowd figure — Farmer' },
  { slot: 'person3', query: 'woman character', index: 1, note: 'crowd figure — Woman' },
];

async function search(query, limit = 6) {
  const url = `https://api.poly.pizza/v1/search/${encodeURIComponent(query)}?limit=${limit}`;
  const res = await fetch(url, { headers: { 'x-auth-token': KEY } });
  if (!res.ok) throw new Error(`search "${query}" -> HTTP ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), source: 'poly.pizza', models: {} };

  for (const item of WANTED) {
    try {
      const results = await search(item.query);
      if (!results.length) { console.log(`  [skip] no results for "${item.query}"`); continue; }
      // Log candidates so a human can re-pick by editing index.
      console.log(`\n"${item.query}" candidates:`);
      results.slice(0, 5).forEach((r, i) =>
        console.log(`   [${i}] ${r.Title} — ${r['Tri Count']} tris — ${r.Creator?.Username}`));
      const chosen = results[item.index] || results[0];
      const file = `${item.slot}.glb`;
      const bytes = await download(chosen.Download, path.join(OUT_DIR, file));
      manifest.models[item.slot] = {
        file: `assets/models/${file}`,
        title: chosen.Title,
        triCount: chosen['Tri Count'],
        licence: chosen.Licence,
        attribution: chosen.Attribution,
        polyPizzaId: chosen.ID,
        note: item.note || '',
      };
      console.log(`  -> saved ${file} (${(bytes / 1024).toFixed(0)} KB) "${chosen.Title}"`);
    } catch (e) {
      console.log(`  [error] ${item.slot}: ${e.message}`);
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written: ${MANIFEST}`);
  console.log(`Models: ${Object.keys(manifest.models).join(', ')}`);
}

main();
