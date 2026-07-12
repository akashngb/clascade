'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Layers, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useDemo } from '@/lib/demoStore';
import type { FlowNode, FlowEdge, NodeType } from '@/lib/types';
import clsx from 'clsx';

/* ──────────────── Node styles ──────────────── */
const NODE_COLORS: Record<NodeType, { card: string; title: string; sub: string; badge: string }> = {
  scene: {
    card: 'bg-zinc-800 border-zinc-600',
    title: 'text-white',
    sub: 'text-zinc-400',
    badge: 'bg-zinc-700 text-zinc-300',
  },
  mechanic: {
    card: 'bg-teal-950 border-teal-700',
    title: 'text-white',
    sub: 'text-teal-400',
    badge: 'bg-teal-900 text-teal-300',
  },
  branch: {
    card: 'bg-purple-950 border-purple-700',
    title: 'text-white',
    sub: 'text-purple-400',
    badge: 'bg-purple-900 text-purple-300',
  },
  state: {
    card: 'bg-indigo-950 border-indigo-700',
    title: 'text-white',
    sub: 'text-indigo-400',
    badge: 'bg-indigo-900 text-indigo-300',
  },
  asset: {
    card: 'bg-orange-950 border-orange-700',
    title: 'text-white',
    sub: 'text-orange-400',
    badge: 'bg-orange-900 text-orange-300',
  },
};

/* ──────────────── SVG Edge ──────────────── */
function EdgePath({ edge, nodes }: { edge: FlowEdge; nodes: FlowNode[] }) {
  const from = nodes.find(n => n.id === edge.fromId);
  const to = nodes.find(n => n.id === edge.toId);
  if (!from || !to) return null;

  const sx = from.x + from.width / 2;
  const sy = from.y + from.height;
  const ex = to.x + to.width / 2;
  const ey = to.y;
  const midY = (sy + ey) / 2;

  const d = `M ${sx},${sy} C ${sx},${midY} ${ex},${midY} ${ex},${ey}`;
  const isDep = edge.edgeType === 'dependency';

  return (
    <path
      d={d}
      stroke={isDep ? '#4a3569' : '#2a3347'}
      strokeWidth={1.5}
      strokeDasharray={isDep ? '5,4' : undefined}
      fill="none"
      markerEnd="url(#arrow)"
      className="draw-edge"
    />
  );
}

/* ──────────────── Flow Node Card ──────────────── */
function FlowNodeCard({
  node,
  onAccept,
}: {
  node: FlowNode;
  onAccept: (id: string) => void;
}) {
  const colors = NODE_COLORS[node.type];
  const isGenerating = node.status === 'generating';
  const isProposed = node.status === 'proposed';
  const isError = node.status === 'error';

  return (
    <div
      className={clsx(
        'absolute rounded-xl border px-3 py-2.5 select-none transition-shadow hover:shadow-lg hover:shadow-black/30',
        colors.card,
        isProposed && 'border-dashed opacity-75',
        isError && '!border-red-500',
        node.visible && (isGenerating ? 'spring-in' : 'spring-in')
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
    >
      {/* Shimmer overlay while generating */}
      {isGenerating && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="shimmer w-full h-full" />
        </div>
      )}

      <div className="relative z-10">
        <p className={clsx('text-[13px] font-semibold truncate', colors.title)}>{node.label}</p>
        <p className={clsx('text-[11px] mt-0.5 truncate', colors.sub)}>{node.subtitle}</p>
        {node.source && (
          <p className="text-[10px] text-muted mt-1.5">{node.source}</p>
        )}
      </div>

      {/* Accept button for proposed nodes */}
      {isProposed && !isGenerating && (
        <button
          onClick={() => onAccept(node.id)}
          className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30 transition-colors z-20"
        >
          Accept
        </button>
      )}

      {/* Type badge */}
      <div className={clsx(
        'absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide',
        colors.badge
      )}>
        {node.type}
      </div>
    </div>
  );
}

/* ──────────────── Empty state ──────────────── */
function EmptyCanvas() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <Layers className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
        <p className="text-[13px] text-muted opacity-60">Flow builds as you answer questions</p>
        <p className="text-[11px] text-muted opacity-40 mt-1">Start by selecting a deck in Sources →</p>
      </div>
    </div>
  );
}

/* ──────────────── FlowTab ──────────────── */
export default function FlowTab() {
  const { state, dispatch } = useDemo();
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [scale, setScale] = useState(1);

  const visibleNodes = state.flowNodes.filter(n => n.visible);

  // Edges only between visible nodes
  const visibleEdges = state.flowEdges.filter(e => {
    const fromVis = visibleNodes.find(n => n.id === e.fromId);
    const toVis = visibleNodes.find(n => n.id === e.toId);
    return fromVis && toVis;
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(2, Math.max(0.3, s * delta)));
  }, []);

  const resetView = () => { setPan({ x: 60, y: 40 }); setScale(1); };

  const handleAccept = (nodeId: string) => {
    dispatch({ type: 'SET_NODE_STATUS', nodeId, status: 'built' });
  };

  // Canvas size: enough to contain all nodes
  const CANVAS_W = 800;
  const CANVAS_H = 600;

  return (
    <div className="relative w-full h-full overflow-hidden dot-grid bg-surface">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button
          onClick={() => setScale(s => Math.min(2, s * 1.2))}
          className="w-7 h-7 rounded-md bg-surface-2 border border-surface flex items-center justify-center text-muted hover:text-slate-300 hover:border-brand/30 transition-all"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.3, s * 0.8))}
          className="w-7 h-7 rounded-md bg-surface-2 border border-surface flex items-center justify-center text-muted hover:text-slate-300 hover:border-brand/30 transition-all"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetView}
          className="w-7 h-7 rounded-md bg-surface-2 border border-surface flex items-center justify-center text-muted hover:text-slate-300 hover:border-brand/30 transition-all"
          title="Reset view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-3 right-3 z-20 text-[10px] text-muted font-mono bg-surface-2/80 px-2 py-1 rounded border border-surface">
        {Math.round(scale * 100)}%
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={clsx(
          'absolute inset-0 overflow-hidden',
          isPanning.current ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: CANVAS_W,
            height: CANVAS_H,
            position: 'absolute',
          }}
        >
          {/* SVG for edges */}
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: CANVAS_W, height: CANVAS_H, overflow: 'visible', pointerEvents: 'none' }}
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#2a3347" />
              </marker>
            </defs>
            {visibleEdges.map(edge => (
              <EdgePath key={edge.id} edge={edge} nodes={visibleNodes} />
            ))}
          </svg>

          {/* Nodes */}
          {visibleNodes.map(node => (
            <FlowNodeCard key={node.id} node={node} onAccept={handleAccept} />
          ))}
        </div>
      </div>

      {/* Empty state overlay */}
      {visibleNodes.length === 0 && <EmptyCanvas />}
    </div>
  );
}
