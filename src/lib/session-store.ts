import "server-only";

export type ClassroomSession = {
  code: string;
  currentPhase: number;
  paused: boolean;
  spotlightStudentId: string | null;
  updatedAt: string;
};

const globalSessions = globalThis as typeof globalThis & { __clascadeSessions?: Map<string, ClassroomSession> };
const sessions = globalSessions.__clascadeSessions ?? new Map<string, ClassroomSession>();
globalSessions.__clascadeSessions = sessions;

export function getSession(code: string): ClassroomSession {
  const normalized = code.toUpperCase();
  const existing = sessions.get(normalized);
  if (existing) return existing;
  const created = { code: normalized, currentPhase: 0, paused: false, spotlightStudentId: null, updatedAt: new Date().toISOString() };
  sessions.set(normalized, created);
  return created;
}

export function updateSession(code: string, patch: Partial<Pick<ClassroomSession, "currentPhase" | "paused" | "spotlightStudentId">>) {
  const current = getSession(code);
  const next = { ...current, ...patch, code: current.code, currentPhase: Math.max(0, Number(patch.currentPhase ?? current.currentPhase)), updatedAt: new Date().toISOString() };
  sessions.set(current.code, next);
  return next;
}
