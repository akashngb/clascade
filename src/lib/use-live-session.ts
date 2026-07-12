"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveSession } from "@/lib/renderer-protocol";

type PatchInput = Partial<
  Pick<LiveSession, "currentPhase" | "paused" | "phaseCount" | "renderer" | "spotlightStudentId">
>;

// Poll the shared classroom session. Teachers also get `patch` to write it.
// Polling (default 1s) is the transport; it is serverless-safe as long as the
// session store itself is durable (see lib/session-store.ts).
export function useLiveSession(code: string, { intervalMs = 1000 }: { intervalMs?: number } = {}) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(code)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`session ${res.status}`);
      const data = (await res.json()) as LiveSession;
      if (!stopped.current) {
        setSession(data);
        setError(null);
      }
    } catch (e) {
      if (!stopped.current) setError(e instanceof Error ? e.message : "sync error");
    }
  }, [code]);

  const patch = useCallback(
    async (input: PatchInput) => {
      // optimistic: reflect locally right away, then reconcile with the server.
      setSession((prev) => (prev ? { ...prev, ...input } : prev));
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(code)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const data = (await res.json()) as LiveSession;
          if (!stopped.current) setSession(data);
        }
      } catch {
        /* next poll reconciles */
      }
    },
    [code]
  );

  useEffect(() => {
    stopped.current = false;
    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => {
      stopped.current = true;
      clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return { session, error, patch, refresh };
}
