'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, RefreshCw, Maximize2, ExternalLink,
  Monitor, Wifi, WifiOff, X, Wrench, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useDemo } from '@/lib/demoStore';
import clsx from 'clsx';

const RENDERER_URL = process.env.NEXT_PUBLIC_RENDERER_URL ?? 'http://localhost:5173';

type Aspect = '16:9' | '4:3' | 'phone';
const ASPECT_RATIOS: Record<Aspect, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  phone: 'aspect-[9/16]',
};

/* ──────────────── Animated canvas placeholder ──────────────── */
function AnimatedPlaceholder({ active }: { active: boolean }) {
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

    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      speed: Math.random() * 0.002 + 0.0005,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);

      // Perspective grid
      const hy = h * 0.55;
      ctx.save();
      ctx.globalAlpha = 0.05 + (active ? 0.03 : 0);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 0.8;
      const vx = w / 2, vy = hy;
      for (let i = 0; i <= 14; i++) {
        const x = (i / 14) * w;
        ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let j = 1; j <= 8; j++) {
        const p = j / 8;
        const y = hy + (h - hy) * p;
        const sp = (y - hy) / (h - hy);
        ctx.beginPath();
        ctx.moveTo(vx - sp * w * 0.5, y);
        ctx.lineTo(vx + sp * w * 0.5, y);
        ctx.stroke();
      }
      ctx.restore();

      // Horizon glow
      const hg = ctx.createLinearGradient(0, hy - 2, 0, hy + 3);
      hg.addColorStop(0, 'rgba(99,102,241,0)');
      hg.addColorStop(0.5, `rgba(99,102,241,${active ? 0.35 : 0.2})`);
      hg.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, hy - 2, w, 5);

      // Stars
      stars.forEach(s => {
        const pulse = 0.5 + 0.5 * Math.sin(t * s.speed * 4000 + s.phase);
        ctx.globalAlpha = 0.2 + 0.5 * pulse;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h * 0.55, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Glows
      [[0.3, 0.4, '#6366f1', 0.1], [0.7, 0.35, '#8b5cf6', 0.07]].forEach(([bx, by, col, a]) => {
        const cx = (bx as number) * w + Math.sin(t * 0.001) * 20;
        const cy = (by as number) * h;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
        grad.addColorStop(0, (col as string) + Math.round((a as number) * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.fill();
      });

      t += 16;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [active]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/* ──────────────── PlayPanel ──────────────── */
export default function PlayPanel() {
  const { state, dispatch } = useDemo();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [phase, setPhase] = useState(1);
  const [paused, setPaused] = useState(false);
  const [aspect, setAspect] = useState<Aspect>('16:9');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isBuilt = state.demoPhase === 'built';

  const tryConnect = () => {
    setLoading(true);
    setConnected(false);
    setIframeKey(k => k + 1);
  };

  const post = (msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(msg, RENDERER_URL);
  };

  const goPhase = (dir: 1 | -1) => {
    const next = Math.max(1, phase + dir);
    setPhase(next);
    post({ type: 'SET_PHASE', phaseIndex: next - 1 });
  };

  const togglePause = () => {
    setPaused(p => !p);
    post({ type: paused ? 'RESUME' : 'PAUSE' });
  };

  const isPresent = state.layoutPreset === 'present';

  return (
    <div className="flex flex-col h-full bg-surface border-l border-surface overflow-hidden" style={isPresent ? { width: '100%' } : { width: state.playWidth }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface bg-surface-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-muted" />
          <span className="text-[12px] font-semibold text-subtle uppercase tracking-wider">Play</span>
          {connected ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Wifi className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <WifiOff className="w-3 h-3" /> Off
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Aspect ratio */}
          <div className="flex items-center gap-0.5 mr-1">
            {(['16:9', 'phone'] as Aspect[]).map(a => (
              <button
                key={a}
                onClick={() => setAspect(a)}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] transition-all',
                  aspect === a ? 'bg-surface-3 text-white' : 'text-muted hover:text-slate-300'
                )}
              >
                {a}
              </button>
            ))}
          </div>

          {connected && (
            <>
              <button onClick={() => goPhase(-1)} disabled={phase <= 1} className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted font-mono">{phase}</span>
              <button onClick={() => goPhase(1)} className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={togglePause} className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors">
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <div className="w-px h-3 bg-surface mx-0.5" />
            </>
          )}

          <button onClick={tryConnect} className={clsx('p-1 rounded hover:bg-surface-3 transition-colors', loading ? 'text-brand animate-spin' : 'text-muted hover:text-slate-300')} title="Connect">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a href={RENDERER_URL} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors" title="Popout">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden bg-surface">
        <AnimatedPlaceholder active={isBuilt} />

        {/* iframe */}
        {(loading || connected) && (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={RENDERER_URL}
            onLoad={() => { setLoading(false); setConnected(true); }}
            onError={() => { setLoading(false); setConnected(false); }}
            className={clsx('absolute inset-0 w-full h-full border-0 transition-opacity duration-300', connected ? 'opacity-100' : 'opacity-0')}
            sandbox="allow-scripts allow-same-origin"
            title="3D Renderer"
          />
        )}

        {/* Not connected overlay */}
        {!connected && !loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center bg-surface-1/80 backdrop-blur-sm border border-surface rounded-2xl px-6 py-5 max-w-[200px]">
              <Monitor className="w-8 h-8 text-muted mx-auto mb-2.5 opacity-50" />
              <p className="text-[12px] font-medium text-slate-300 mb-1">
                {isBuilt ? 'Renderer built' : 'Not connected'}
              </p>
              <p className="text-[10px] text-muted mb-3">
                {isBuilt
                  ? 'Start the renderer to preview'
                  : 'Complete the flow first'}
              </p>
              {isBuilt && (
                <button
                  onClick={tryConnect}
                  className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg bg-brand text-white text-[12px] font-medium hover:bg-brand-muted transition-colors"
                >
                  <Play className="w-3 h-3" /> Connect
                </button>
              )}
              {isBuilt && (
                <p className="text-[10px] text-muted mt-2 font-mono">
                  cd apps/history-game<br />&& npm run dev
                </p>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-surface-1/80 backdrop-blur-sm border border-surface rounded-xl px-4 py-2.5 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-brand animate-spin" />
              <span className="text-[12px] text-slate-300">Connecting…</span>
            </div>
          </div>
        )}
      </div>

      {/* Version chips + Fix It */}
      <div className="border-t border-surface bg-surface-1 px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {state.versions.length > 0 ? (
            state.versions.map(v => (
              <button
                key={v}
                onClick={() => dispatch({ type: 'SET_ACTIVE_VERSION', version: v })}
                className={clsx(
                  'w-7 h-7 rounded-full text-[11px] font-semibold transition-all',
                  state.activeVersion === v
                    ? 'bg-brand text-white'
                    : 'bg-surface-3 text-muted hover:text-slate-300'
                )}
              >
                {v}
              </button>
            ))
          ) : (
            <span className="text-[11px] text-muted">No versions yet</span>
          )}
        </div>

        {connected && (
          <button className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors">
            <Wrench className="w-3.5 h-3.5" />
            Fix it
          </button>
        )}
      </div>
    </div>
  );
}
