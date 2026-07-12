import "server-only";

// Classroom session = the single source of truth the teacher writes and every
// student reads. In production this MUST live in a shared store: on serverless
// (Vercel/Netlify) each request can hit a different instance, so an in-process
// Map desyncs teachers from students and is wiped on cold start.
//
// Storage is pluggable:
//   • If KV_REST_API_URL + KV_REST_API_TOKEN are set (Vercel KV / Upstash Redis,
//     both expose the same REST API) → durable, multi-instance safe.
//   • Otherwise → in-memory Map (fine for `next dev` and single-instance hosts
//     like Render/Railway/a VM; logs a one-time warning so prod misconfig is loud).

export type ClassroomSession = {
  code: string;
  currentPhase: number;
  paused: boolean;
  phaseCount: number;
  spotlightStudentId: string | null;
  renderer: string | null;
  updatedAt: string;
};

export type SessionPatch = Partial<
  Pick<ClassroomSession, "currentPhase" | "paused" | "phaseCount" | "spotlightStudentId" | "renderer">
>;

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_ENABLED = Boolean(KV_URL && KV_TOKEN);
const keyFor = (code: string) => `clascade:session:${code.toUpperCase()}`;

function freshSession(code: string): ClassroomSession {
  return {
    code: code.toUpperCase(),
    currentPhase: 0,
    paused: false,
    phaseCount: 0,
    spotlightStudentId: null,
    renderer: null,
    updatedAt: new Date().toISOString(),
  };
}

// ---- In-memory fallback (dev / single instance) ----
const globalSessions = globalThis as typeof globalThis & {
  __clascadeSessions?: Map<string, ClassroomSession>;
  __clascadeKvWarned?: boolean;
};
const memory = globalSessions.__clascadeSessions ?? new Map<string, ClassroomSession>();
globalSessions.__clascadeSessions = memory;

function warnOnce() {
  if (KV_ENABLED || globalSessions.__clascadeKvWarned) return;
  globalSessions.__clascadeKvWarned = true;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[clascade] No KV_REST_API_URL/TOKEN set — classroom sessions use an in-memory store. " +
        "This ONLY works on a single always-on instance. On serverless, teacher and students will desync. " +
        "Connect Vercel KV or Upstash Redis for production."
    );
  }
}

// ---- KV REST helpers (Upstash / Vercel KV compatible) ----
async function kvGet(code: string): Promise<ClassroomSession | null> {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(keyFor(code))}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV get failed: ${res.status}`);
  const body = (await res.json()) as { result: string | null };
  if (!body.result) return null;
  try {
    return JSON.parse(body.result) as ClassroomSession;
  } catch {
    return null;
  }
}

async function kvSet(session: ClassroomSession): Promise<void> {
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(keyFor(session.code))}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "text/plain" },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error(`KV set failed: ${res.status}`);
}

// ---- Public API (async so it works with any backend) ----
export async function getSession(code: string): Promise<ClassroomSession> {
  warnOnce();
  const normalized = code.toUpperCase();
  if (KV_ENABLED) {
    const existing = await kvGet(normalized);
    if (existing) return { ...freshSession(normalized), ...existing, code: normalized };
    const created = freshSession(normalized);
    await kvSet(created);
    return created;
  }
  const existing = memory.get(normalized);
  if (existing) return existing;
  const created = freshSession(normalized);
  memory.set(normalized, created);
  return created;
}

export async function updateSession(code: string, patch: SessionPatch): Promise<ClassroomSession> {
  const current = await getSession(code);
  // Only apply keys that were actually provided — spreading `undefined` would
  // otherwise wipe existing fields (e.g. advancing a phase must not clear the
  // renderer URL or the paused flag).
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as SessionPatch;
  const next: ClassroomSession = {
    ...current,
    ...clean,
    code: current.code,
    currentPhase: Math.max(0, Math.round(Number(clean.currentPhase ?? current.currentPhase))),
    phaseCount: Math.max(0, Math.round(Number(clean.phaseCount ?? current.phaseCount))),
    updatedAt: new Date().toISOString(),
  };
  if (KV_ENABLED) await kvSet(next);
  else memory.set(current.code, next);
  return next;
}
