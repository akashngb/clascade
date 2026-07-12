import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '..', '.env');

// Minimal .env loader (no dependency). Only sets keys not already in the
// environment, so real env vars always win over the file.
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv(envPath);

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}. Copy .env.example to .env and fill it in.`);
  return v;
}

export const config = {
  project: () => required('GCP_PROJECT'),
  location: () => process.env.GCP_LOCATION || 'us-central1',
  // Override to your preferred Gemini per the model routing table in CLAUDE.md.
  model: () => process.env.GEMINI_MODEL || 'gemini-2.0-flash-001',
  // Either a path to a service-account JSON file, or the JSON inline.
  serviceAccountFile: () => process.env.GOOGLE_APPLICATION_CREDENTIALS,
  serviceAccountInline: () => process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
};

export default config;
