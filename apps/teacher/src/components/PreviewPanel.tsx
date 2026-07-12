'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  Play,
  ChevronLeft,
  ChevronRight,
  Pause,
  Monitor,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const RENDERER_URL = process.env.NEXT_PUBLIC_RENDERER_URL ?? 'http://localhost:5173';

function CanvasPlaceholder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const STAR_COUNT = 60;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      speed: Math.random() * 0.0002 + 0.00005,
      phase: Math.random() * Math.PI * 2,
    }));

    const ORBS = [
      { baseX: 0.3, baseY: 0.45, r: 38, color: '#6366f1', alpha: 0.18, speed: 0.0008 },
      { baseX: 0.65, baseY: 0.55, r: 28, color: '#8b5cf6', alpha: 0.14, speed: 0.0012 },
      { baseX: 0.5, baseY: 0.3, r: 20, color: '#4f46e5', alpha: 0.10, speed: 0.001 },
    ];

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Background
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(99,102,241,0.04)';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Glow orbs
      ORBS.forEach((orb) => {
        const cx = w * orb.baseX + Math.sin(t * orb.speed * 1000 + orb.speed) * 30;
        const cy = h * orb.baseY + Math.cos(t * orb.speed * 800) * 20;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orb.r * 3);
        grad.addColorStop(0, orb.color + Math.round(orb.alpha * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, orb.r * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stars
      stars.forEach((s) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * s.speed * 5000 + s.phase);
        ctx.globalAlpha = 0.3 + 0.4 * pulse;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Horizon line
      const horizonY = h * 0.6;
      const hGrad = ctx.createLinearGradient(0, horizonY - 1, 0, horizonY + 2);
      hGrad.addColorStop(0, 'rgba(99,102,241,0.0)');
      hGrad.addColorStop(0.5, 'rgba(99,102,241,0.25)');
      hGrad.addColorStop(1, 'rgba(99,102,241,0.0)');
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, horizonY - 1, w, 3);

      // Perspective ground grid
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 0.8;
      const vanishX = w / 2;
      const vanishY = horizonY;
      const groundLines = 12;
      for (let i = 0; i <= groundLines; i++) {
        const x = (i / groundLines) * w;
        ctx.beginPath(); ctx.moveTo(vanishX, vanishY); ctx.lineTo(x, h); ctx.stroke();
      }
      const rowCount = 8;
      for (let j = 1; j <= rowCount; j++) {
        const progress = j / rowCount;
        const y = vanishY + (h - vanishY) * progress;
        const spread = (y - vanishY) / (h - vanishY);
        ctx.beginPath();
        ctx.moveTo(vanishX - spread * w * 0.5, y);
        ctx.lineTo(vanishX + spread * w * 0.5, y);
        ctx.stroke();
      }
      ctx.restore();

      t += 16;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

export default function PreviewPanel({ onClose }: { onClose?: () => void }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [phase, setPhase] = useState(1);
  const [paused, setPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const tryConnect = () => {
    setLoading(true);
    setConnected(false);
    setIframeKey((k) => k + 1);
  };

  const handleIframeLoad = () => {
    setLoading(false);
    setConnected(true);
  };

  const handleIframeError = () => {
    setLoading(false);
    setConnected(false);
  };

  const postToRenderer = (msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(msg, RENDERER_URL);
  };

  const goPhase = (dir: 1 | -1) => {
    const next = Math.max(1, phase + dir);
    setPhase(next);
    postToRenderer({ type: 'SET_PHASE', phaseIndex: next - 1 });
  };

  const togglePause = () => {
    setPaused((p) => !p);
    postToRenderer({ type: paused ? 'RESUME' : 'PAUSE' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border bg-surface-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-medium text-slate-300">3D Preview</span>
          <div className="flex items-center gap-1">
            {connected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-muted" />
                <span className="text-[10px] text-muted">Disconnected</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {connected && (
            <>
              {/* Phase controls */}
              <button
                onClick={() => goPhase(-1)}
                disabled={phase <= 1}
                className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 disabled:opacity-30 transition-colors"
                title="Previous phase"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted px-1 font-mono">Phase {phase}</span>
              <button
                onClick={() => goPhase(1)}
                className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors"
                title="Next phase"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3 bg-surface-border mx-1" />
              <button
                onClick={togglePause}
                className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors"
                title={paused ? 'Resume' : 'Pause'}
              >
                {paused ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="w-px h-3 bg-surface-border mx-1" />
            </>
          )}
          <button
            onClick={tryConnect}
            className={clsx(
              'p-1 rounded hover:bg-surface-3 transition-colors',
              loading ? 'text-brand animate-spin' : 'text-muted hover:text-slate-300'
            )}
            title="Reconnect renderer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={RENDERER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {onClose && (
            <>
              <div className="w-px h-3 bg-surface-border mx-0.5" />
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                title="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden bg-[#0f1117]">
        {/* Animated canvas placeholder — always present as background */}
        <CanvasPlaceholder />

        {/* iframe overlay when attempting connection */}
        {(loading || connected) && (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={RENDERER_URL}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className={clsx(
              'absolute inset-0 w-full h-full border-0 transition-opacity duration-300',
              connected ? 'opacity-100' : 'opacity-0'
            )}
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="3D Lesson Renderer"
          />
        )}

        {/* Disconnected overlay */}
        {!connected && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center bg-surface-1/80 backdrop-blur-md border border-surface-border rounded-2xl px-8 py-6 max-w-xs">
              <div className="w-10 h-10 rounded-xl bg-surface-3 border border-surface-border flex items-center justify-center mx-auto mb-3">
                <Monitor className="w-5 h-5 text-muted" />
              </div>
              <p className="text-sm font-medium text-slate-200 mb-1">Renderer not connected</p>
              <p className="text-xs text-muted mb-4">
                Start the renderer at{' '}
                <code className="font-mono text-brand">{RENDERER_URL}</code>
              </p>
              <button
                onClick={tryConnect}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-brand hover:bg-brand-muted text-white text-sm font-medium transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Connect
              </button>
              <p className="text-[10px] text-muted mt-3">
                cd apps/history-game &amp;&amp; npm run dev
              </p>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-surface-1/80 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-2.5 border border-surface-border">
              <RefreshCw className="w-4 h-4 text-brand animate-spin" />
              <span className="text-sm text-slate-300">Connecting to renderer…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
