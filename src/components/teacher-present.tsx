"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight, Pause, Play, Copy, Broadcast } from "@phosphor-icons/react";
import { useLiveSession } from "@/lib/use-live-session";
import { RendererFrame } from "@/components/renderer-frame";
import { DEFAULT_RENDERER } from "@/lib/renderer-protocol";

// Teacher's live control surface. Everything here writes the shared session, so
// every joined student mirrors the phase within one poll (~1s).
export function TeacherPresent({ code, renderer = DEFAULT_RENDERER }: { code: string; renderer?: string }) {
  const { session, patch } = useLiveSession(code, { intervalMs: 1200 });
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const rendererSynced = useRef(false);
  const countSynced = useRef(false);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/live/${code}`);
  }, [code]);

  // Publish which renderer students should embed (once).
  useEffect(() => {
    if (session && !rendererSynced.current && session.renderer !== renderer) {
      rendererSynced.current = true;
      patch({ renderer });
    }
  }, [session, renderer, patch]);

  const phaseCount = session?.phaseCount ?? 0;
  const current = session?.currentPhase ?? 0;
  const paused = session?.paused ?? false;

  const onPhaseCount = useCallback(
    (count: number) => {
      if (!countSynced.current || session?.phaseCount !== count) {
        countSynced.current = true;
        if (session?.phaseCount !== count) patch({ phaseCount: count });
      }
    },
    [patch, session?.phaseCount]
  );

  const go = useCallback(
    (dir: 1 | -1) => {
      const max = phaseCount > 0 ? phaseCount - 1 : Number.MAX_SAFE_INTEGER;
      const next = Math.min(max, Math.max(0, current + dir));
      if (next !== current) patch({ currentPhase: next });
    },
    [current, phaseCount, patch]
  );
  const togglePause = useCallback(() => patch({ paused: !paused }), [paused, patch]);

  // Keyboard: ← / → step phases, space pauses.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.code === "Space") { e.preventDefault(); togglePause(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, togglePause]);

  const copy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0f1117", color: "#e6e9ef" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 18px", borderBottom: "1px solid #23262f" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, letterSpacing: 0.3 }}>
          <Broadcast size={18} weight="fill" color="#f0596b" /> LIVE
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#8a90a2" }}>Class code</span>
          <strong style={{ fontSize: 22, letterSpacing: 4, fontFamily: "ui-monospace, monospace" }}>{code.toUpperCase()}</strong>
        </div>
        <button onClick={copy} style={btn}>
          <Copy size={14} /> {copied ? "Copied!" : "Copy join link"}
        </button>
        <Link href={joinUrl || "#"} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none" }}>
          Open student view ↗
        </Link>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#8a90a2" }}>
          Students at <code style={{ color: "#c7ccd8" }}>/live/{code.toUpperCase()}</code> follow you automatically
        </span>
      </header>

      <div style={{ position: "relative", flex: 1, minHeight: 0, background: "#05060a" }}>
        <RendererFrame src={renderer} phaseIndex={current} paused={paused} onPhaseCount={onPhaseCount} interactive />
      </div>

      <footer style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "12px 18px", borderTop: "1px solid #23262f", background: "#0c0e14" }}>
        <button onClick={() => go(-1)} disabled={current <= 0} style={{ ...ctrl, opacity: current <= 0 ? 0.4 : 1 }} aria-label="Previous phase">
          <CaretLeft size={20} weight="bold" />
        </button>
        <span style={{ minWidth: 120, textAlign: "center", fontFamily: "ui-monospace, monospace", fontSize: 14 }}>
          Phase {current + 1}{phaseCount ? ` / ${phaseCount}` : ""}
        </span>
        <button onClick={() => go(1)} disabled={phaseCount > 0 && current >= phaseCount - 1} style={{ ...ctrl, opacity: phaseCount > 0 && current >= phaseCount - 1 ? 0.4 : 1 }} aria-label="Next phase">
          <CaretRight size={20} weight="bold" />
        </button>
        <button onClick={togglePause} style={{ ...ctrl, background: paused ? "#f0596b" : "#1b1e27", width: "auto", padding: "0 16px", gap: 8 }}>
          {paused ? <Play size={16} weight="fill" /> : <Pause size={16} weight="fill" />}
          {paused ? "Resume class" : "Pause class"}
        </button>
      </footer>
    </main>
  );
}

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12.5,
  borderRadius: 8, border: "1px solid #2c303b", background: "#171a22", color: "#c7ccd8", cursor: "pointer",
};
const ctrl: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", height: 44, width: 44,
  borderRadius: 10, border: "1px solid #2c303b", background: "#1b1e27", color: "#e6e9ef", cursor: "pointer",
};
