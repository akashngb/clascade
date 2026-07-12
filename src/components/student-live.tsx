"use client";

import { useState } from "react";
import { Pause } from "@phosphor-icons/react";
import { useLiveSession } from "@/lib/use-live-session";
import { RendererFrame } from "@/components/renderer-frame";
import { DEFAULT_RENDERER } from "@/lib/renderer-protocol";

// Student view: joins the class code, then simply mirrors whatever phase the
// teacher is on. Students can look around within a phase but cannot advance it —
// the embedded renderer's own phase controls are hidden in embed mode.
export function StudentLive({ code }: { code: string }) {
  const { session } = useLiveSession(code, { intervalMs: 1000 });
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const renderer = session?.renderer || DEFAULT_RENDERER;
  const current = session?.currentPhase ?? 0;
  const paused = session?.paused ?? false;

  if (!joined) {
    return (
      <main style={{ display: "grid", placeItems: "center", height: "100dvh", background: "#141821", color: "#e6e9ef", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#89d4a2", textTransform: "uppercase" }}>
            Join class · {code.toUpperCase()}
          </p>
          <h1 style={{ fontSize: 34, margin: "10px 0 6px", letterSpacing: -1 }}>Step inside the lesson</h1>
          <p style={{ color: "#98a0b3", fontSize: 14, lineHeight: 1.5 }}>
            Your teacher controls the pace. Enter the name they know you by.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && setJoined(true)}
            placeholder="Maya K."
            style={{ marginTop: 16, width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #2c303b", background: "#0f131b", color: "#e6e9ef", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={() => name.trim() && setJoined(true)}
            style={{ marginTop: 12, width: "100%", padding: "12px", borderRadius: 999, border: "none", background: "#89d4a2", color: "#0c1a12", fontWeight: 700, cursor: "pointer" }}
          >
            Enter lesson →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ position: "relative", height: "100dvh", background: "#05060a", color: "#e6e9ef" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <RendererFrame src={renderer} phaseIndex={current} paused={paused} interactive title="Lesson" />
      </div>

      <div style={{ position: "absolute", top: 12, left: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: "rgba(12,16,22,0.7)", backdropFilter: "blur(8px)", fontSize: 12, fontWeight: 600, color: "#cdd3df", pointerEvents: "none" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: session ? "#89d4a2" : "#c9a13a" }} />
        {session ? "Synced with teacher" : "Connecting…"} · {code.toUpperCase()}
      </div>

      {paused && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(15,19,27,0.88)", backdropFilter: "blur(10px)", zIndex: 10 }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "inline-flex", width: 64, height: 64, borderRadius: 999, alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)" }}>
              <Pause size={28} weight="fill" />
            </span>
            <h2 style={{ marginTop: 22, fontSize: 32, letterSpacing: -1 }}>Look up at your teacher.</h2>
            <p style={{ marginTop: 8, color: "#98a0b3" }}>Your place is saved. The lesson resumes together.</p>
          </div>
        </div>
      )}
    </main>
  );
}
