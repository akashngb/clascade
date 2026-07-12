import { GoogleAuth } from 'google-auth-library';
import { config } from './config.js';

// Thin Vertex AI client: authenticates with a service account (from env only)
// and calls a Gemini model's generateContent REST endpoint. No credentials are
// ever hardcoded — they come from GOOGLE_APPLICATION_CREDENTIALS (a file path)
// or GOOGLE_SERVICE_ACCOUNT_JSON (inline JSON).
const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

function buildAuth() {
  const inline = config.serviceAccountInline();
  if (inline) {
    let credentials;
    try {
      credentials = JSON.parse(inline);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }
    return new GoogleAuth({ credentials, scopes: SCOPES });
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS (file path) or ADC.
  return new GoogleAuth({ scopes: SCOPES });
}

let authClientPromise;
async function getAccessToken() {
  if (!authClientPromise) authClientPromise = buildAuth().getClient();
  const client = await authClientPromise;
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Failed to obtain a Vertex AI access token.');
  return token;
}

/**
 * Call Gemini generateContent on Vertex AI.
 * @param {{ system?: string, prompt: string, responseSchema?: object, temperature?: number }} args
 * @returns {Promise<string>} the model's text output (JSON string when a schema is given)
 */
export async function generateContent({ system, prompt, responseSchema, temperature = 0.4 }) {
  const project = config.project();
  const location = config.location();
  const model = config.model();
  const token = await getAccessToken();

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 8192,
      ...(responseSchema ? { responseMimeType: 'application/json', responseSchema } : {}),
    },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Vertex AI ${res.status} ${res.statusText}: ${detail.slice(0, 500)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? '').join('').trim();
  if (!text) throw new Error('Vertex AI returned an empty response.');
  return text;
}

export default generateContent;
