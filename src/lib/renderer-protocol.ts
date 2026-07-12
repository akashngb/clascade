// Shared contract between the console (teacher + student pages) and any embedded
// game renderer (iframe). Games opt in by listening for these messages and
// reporting their phase count back. Kept framework-free so a plain Vite/Three.js
// game (e.g. the Sarajevo history game) can implement the same protocol.

export const RENDERER_MSG = "clascade"; // parent (console) → renderer
export const RENDERER_REPLY = "clascade-renderer"; // renderer → parent (console)

export type ToRenderer =
  | { source: typeof RENDERER_MSG; type: "set-phase"; phaseIndex: number }
  | { source: typeof RENDERER_MSG; type: "set-paused"; paused: boolean }
  | { source: typeof RENDERER_MSG; type: "hello" };

export type FromRenderer =
  | { source: typeof RENDERER_REPLY; type: "ready"; phaseCount: number }
  | { source: typeof RENDERER_REPLY; type: "phase"; phaseIndex: number };

// Plain (server-only-free) mirror of ClassroomSession so client code can import a
// type without pulling the server-only store module into the browser bundle.
export type LiveSession = {
  code: string;
  currentPhase: number;
  paused: boolean;
  phaseCount: number;
  spotlightStudentId: string | null;
  renderer: string | null;
  updatedAt: string;
};

// Default embedded renderer (Sarajevo game, built into /public/renderer/sarajevo).
export const DEFAULT_RENDERER = "/renderer/sarajevo/index.html";

// Add ?embed=1 so a renderer can hide its own teacher bar / start gate and let
// the console drive phases instead.
export function embedUrl(src: string): string {
  return src.includes("?") ? `${src}&embed=1` : `${src}?embed=1`;
}
