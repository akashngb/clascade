import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './env.mjs';

// Mint a Vertex AI access token from the service-account key — no external
// dependency. Signs a JWT with the SA private key and exchanges it at Google's
// OAuth token endpoint for a cloud-platform access token.

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function loadServiceAccount() {
  const rel = process.env.GOOGLE_APPLICATION_CREDENTIALS || './secrets/jarvis-sa.json';
  const abs = path.isAbsolute(rel) ? rel : path.join(REPO_ROOT, rel);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

let cached = null;
export async function getAccessToken() {
  if (cached && cached.exp > Date.now() / 1000 + 60) return cached.token;

  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(sa.private_key);
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token exchange -> HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  cached = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return cached.token;
}
