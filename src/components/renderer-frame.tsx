"use client";

import { useCallback, useEffect, useRef } from "react";
import { RENDERER_MSG, RENDERER_REPLY, embedUrl, type FromRenderer, type ToRenderer } from "@/lib/renderer-protocol";

// Embeds a game renderer in an iframe and keeps it locked to the given phase.
//
// Handshake is race-proof: we retry "hello" until the renderer answers "ready"
// (covers the iframe loading before/around React attaching its listener). Once
// ready we push phase/pause — but only on *change*, so a real game doesn't
// re-trigger its phase animation on every tick. Self-heals if the iframe reloads.
export function RendererFrame({
  src,
  phaseIndex,
  paused,
  onPhaseCount,
  interactive = true,
  className,
  title = "Lesson renderer",
}: {
  src: string;
  phaseIndex: number;
  paused: boolean;
  onPhaseCount?: (count: number) => void;
  interactive?: boolean;
  className?: string;
  title?: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const lastPhase = useRef<number>(-1);
  const lastPaused = useRef<boolean | null>(null);
  const phaseRef = useRef(phaseIndex);
  const pausedRef = useRef(paused);
  phaseRef.current = phaseIndex;
  pausedRef.current = paused;

  const send = useCallback((msg: ToRenderer) => {
    ref.current?.contentWindow?.postMessage(msg, "*");
  }, []);

  const pushPhase = useCallback(
    (idx: number) => {
      if (idx !== lastPhase.current) {
        lastPhase.current = idx;
        send({ source: RENDERER_MSG, type: "set-phase", phaseIndex: idx });
      }
    },
    [send]
  );
  const pushPaused = useCallback(
    (p: boolean) => {
      if (p !== lastPaused.current) {
        lastPaused.current = p;
        send({ source: RENDERER_MSG, type: "set-paused", paused: p });
      }
    },
    [send]
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== ref.current?.contentWindow) return;
      const data = event.data as FromRenderer;
      if (!data || data.source !== RENDERER_REPLY) return;
      if (data.type === "ready") {
        ready.current = true;
        onPhaseCount?.(data.phaseCount);
        // Force-assert current desired state on (re)connect.
        lastPhase.current = -1;
        lastPaused.current = null;
        pushPhase(phaseRef.current);
        pushPaused(pausedRef.current);
      }
    }
    window.addEventListener("message", onMessage);
    // Kick + retry the handshake until the renderer answers.
    send({ source: RENDERER_MSG, type: "hello" });
    const iv = setInterval(() => {
      if (ready.current) {
        clearInterval(iv);
        return;
      }
      send({ source: RENDERER_MSG, type: "hello" });
    }, 400);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(iv);
    };
  }, [onPhaseCount, send, pushPhase, pushPaused]);

  // Push updates once ready (only on real change; see pushPhase/pushPaused).
  useEffect(() => {
    if (ready.current) pushPhase(phaseIndex);
  }, [phaseIndex, pushPhase]);
  useEffect(() => {
    if (ready.current) pushPaused(paused);
  }, [paused, pushPaused]);

  return (
    <iframe
      ref={ref}
      src={embedUrl(src)}
      title={title}
      className={className}
      onLoad={() => {
        // Iframe (re)loaded — restart the handshake.
        ready.current = false;
        send({ source: RENDERER_MSG, type: "hello" });
      }}
      allow="autoplay; fullscreen"
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
        pointerEvents: interactive ? "auto" : "none",
      }}
    />
  );
}
