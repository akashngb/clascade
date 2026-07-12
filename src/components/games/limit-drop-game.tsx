"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowCounterClockwise, ArrowLeft, Check, Lightbulb, Plus, SpeakerHigh, SpeakerSlash, Trash } from "@phosphor-icons/react";

type Piece = { id: string; expr: string; from: string; to: string };
type CompiledPiece = { fn: (x: number) => number; lo: number; hi: number; color: string };
type GamePhase = "title" | "playing" | "dropping" | "caught" | "smashed" | "done";

const COLORS = ["#00e7c5", "#ff9a3d", "#ef5ca8"];
const WORLD_X = 12;
const WORLD_Y = 12;
const GRAVITY = 9.8;

const levels = [
  { title: "First Flight", blurb: "Build a gentle rail from the hen to the basket.", spawn: [-7, 7], basket: [6, 0], obstacles: [] as Obstacle[], hint: "Try a decreasing line that begins near y = 6 when x = -7.", example: [{ expr: "6 - 0.45*(x+7)", from: "", to: "" }] },
  { title: "Over the Fence", blurb: "Use an arch to clear the fence at x = 0.", spawn: [-7, 8], basket: [7, 0], obstacles: [{ kind: "fence", x: 0, y: 0, w: .45, h: 3.5 }] as Obstacle[], hint: "A downward-opening parabola can stay high over the fence and descend afterward.", example: [{ expr: "7 - 0.03*(x+8)^2", from: "", to: "" }] },
  { title: "Mind the Hay", blurb: "Clear both bales, or end the rail early and fly.", spawn: [-8, 9], basket: [5, 0], obstacles: [{ kind: "hay", x: -2, y: 0, w: 1.6, h: 1.2 }, { kind: "hay", x: 1.5, y: 0, w: 1.6, h: 1.2 }] as Obstacle[], hint: "Keep the function above y = 1.5 through the second bale near x = 2.3.", example: [{ expr: "2.7 - 0.43*x", from: "", to: "" }] },
  { title: "High Delivery", blurb: "The basket is elevated. Target its y-value.", spawn: [-7, 10], basket: [6, 3.5], obstacles: [{ kind: "post", x: 6, y: 0, w: 1, h: 3.3 }] as Obstacle[], hint: "Evaluate your function near x = 6. It should arrive around y = 4.", example: [{ expr: "6.2 - 0.4*x", from: "", to: "" }] },
  { title: "The Gauntlet", blurb: "Use two pieces to clear the fence and barn.", spawn: [-9, 10], basket: [8, 1], obstacles: [{ kind: "fence", x: -3, y: 0, w: .45, h: 2.5 }, { kind: "barn", x: 4, y: 0, w: 3, h: 4 }, { kind: "post", x: 8, y: 0, w: 1, h: .8 }] as Obstacle[], hint: "Launch from a rising curve ending near x = 2.2, then catch the egg with a second rail behind the barn.", example: [{ expr: "0.12*(x+2)^2 + 3", from: "", to: "2.2" }, { expr: "2*(x-8) + 1", from: "7", to: "" }] },
];

type Obstacle = { kind: "fence" | "hay" | "barn" | "post"; x: number; y: number; w: number; h: number };

export function LimitDropGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eggRef = useRef({ x: -7, y: 7, vx: 0, vy: 0, mode: "idle" as "idle" | "falling" | "riding", piece: -1 });
  const trailRef = useRef<Array<[number, number]>>([]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("title");
  const [pieces, setPieces] = useState<Piece[]>([{ id: "piece-1", expr: "", from: "", to: "" }]);
  const [eggsUsed, setEggsUsed] = useState(0);
  const [levelEggs, setLevelEggs] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [runId, setRunId] = useState(0);
  const level = levels[levelIndex];

  const compiled = useMemo(() => compilePieces(pieces), [pieces]);

  const resetEggFor = (index: number) => {
    const target = levels[index];
    eggRef.current = { x: target.spawn[0], y: target.spawn[1], vx: 0, vy: 0, mode: "idle", piece: -1 };
    trailRef.current = [];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let previous = performance.now();
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio, 1.6);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const loop = (time: number) => {
      const dt = Math.min((time - previous) / 1000, .025);
      previous = time;
      if (phase === "dropping") simulate(dt, level, compiled.list, eggRef.current, trailRef.current, (result) => {
        if (result === "caught") setPhase("caught");
        if (result === "smashed") setPhase("smashed");
      });
      drawGame(ctx, canvas.getBoundingClientRect(), level, compiled.list, eggRef.current, trailRef.current, levelIndex);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [compiled.list, level, levelIndex, phase, runId]);

  const start = () => { resetEggFor(levelIndex); setPhase("playing"); setRunId((value) => value + 1); };
  const drop = () => {
    if (compiled.error) { setError(compiled.error); return; }
    if (!compiled.list.length) { setError("Enter at least one valid function."); return; }
    setError("");
    eggRef.current = { x: level.spawn[0], y: level.spawn[1], vx: .2, vy: 0, mode: "falling", piece: -1 };
    trailRef.current = [];
    setEggsUsed((value) => value + 1);
    setLevelEggs((value) => value + 1);
    setPhase("dropping");
    setRunId((value) => value + 1);
  };
  const retry = () => { resetEggFor(levelIndex); setPhase("playing"); setRunId((value) => value + 1); };
  const next = () => {
    if (levelIndex === levels.length - 1) { setPhase("done"); return; }
    const nextIndex = levelIndex + 1;
    setLevelIndex(nextIndex);
    resetEggFor(nextIndex);
    setPieces([{ id: `piece-${nextIndex}-1`, expr: "", from: "", to: "" }]);
    setLevelEggs(0);
    setShowHint(false);
    setError("");
    setPhase("playing");
  };
  const useExample = () => { setPieces(level.example.map((piece, index) => ({ ...piece, id: `example-${levelIndex}-${index}` }))); setError(""); };
  const updatePiece = (id: string, field: keyof Omit<Piece, "id">, value: string) => setPieces((items) => items.map((piece) => piece.id === id ? { ...piece, [field]: value } : piece));

  return (
    <main className="limit-drop-shell" onPointerDown={() => phase === "title" && start()}>
      <canvas ref={canvasRef} className="limit-drop-canvas" aria-label="Limit Drop function physics playfield" />
      <div className="limit-drop-vignette" />
      <header className="limit-drop-topbar">
        <Link href="/teach" className="limit-drop-back"><ArrowLeft size={15} /> Studio</Link>
        <div className="limit-drop-brand"><span>LIMIT</span><strong>DROP</strong><small>function physics</small></div>
        <button onClick={(event) => { event.stopPropagation(); setMuted((value) => !value); }} className="limit-drop-sound" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <SpeakerSlash size={17} /> : <SpeakerHigh size={17} />}</button>
      </header>

      {phase !== "title" && phase !== "done" && <section className="limit-drop-level-card"><span>Level {levelIndex + 1} of {levels.length}</span><h1>{level.title}</h1><p>{level.blurb}</p><button onClick={() => setShowHint((value) => !value)}><Lightbulb size={14} weight="fill" /> {showHint ? "Hide hint" : "Hint"}</button>{showHint && <div className="limit-drop-hint"><p>{level.hint}</p><button onClick={useExample}>Use one solution</button></div>}</section>}

      {phase !== "title" && phase !== "done" && <section className="limit-drop-score"><strong>{levelEggs}</strong><span>eggs this level</span><div>{levels.map((_, index) => <i key={index} className={index < levelIndex ? "done" : index === levelIndex ? "active" : ""} />)}</div><small>{eggsUsed} total drops</small></section>}

      {(phase === "playing" || phase === "dropping" || phase === "smashed") && <section className="limit-drop-editor" onPointerDown={(event) => event.stopPropagation()}><header><div><span>CHICKEN SCRATCH</span><strong>Draw your rails</strong></div><button onClick={retry}><ArrowCounterClockwise size={14} /> Reset</button></header>{pieces.map((piece, index) => <div className="limit-drop-piece" key={piece.id}><i style={{ background: COLORS[index] }} /><label>f{index + 1}(x) =<input value={piece.expr} onChange={(event) => updatePiece(piece.id, "expr", event.target.value)} placeholder={index === 0 ? "6 - 0.45*(x+7)" : "2*sin(x/2)+3"} spellCheck={false} /></label><label className="domain">from<input value={piece.from} onChange={(event) => updatePiece(piece.id, "from", event.target.value)} placeholder="-∞" /></label><label className="domain">to<input value={piece.to} onChange={(event) => updatePiece(piece.id, "to", event.target.value)} placeholder="+∞" /></label>{pieces.length > 1 && <button onClick={() => setPieces((items) => items.filter((item) => item.id !== piece.id))} aria-label={`Remove function ${index + 1}`}><Trash size={13} /></button>}</div>)}{error && <p className="limit-drop-error">{error}</p>}<footer>{pieces.length < 3 && <button onClick={() => setPieces((items) => [...items, { id: crypto.randomUUID(), expr: "", from: "", to: "" }])}><Plus size={13} /> Add function</button>}<button className="limit-drop-drop" disabled={phase === "dropping"} onClick={drop}>DROP</button></footer></section>}

      {phase === "title" && <section className="limit-drop-title"><div className="limit-drop-egg-logo" /><p>ALGEBRA AFTER DARK</p><h1>LIMIT<br /><strong>DROP</strong></h1><span>Type functions. Build rails. Save the egg.</span><button onClick={start}>Enter the farm <Check size={15} /></button></section>}
      {phase === "smashed" && <ResultCard title="SPLAT" copy="The egg missed the rail, hit an obstacle, or ran out of room. Revise the function and test again." action="Retry" onAction={retry} />}
      {phase === "caught" && <ResultCard title="CAUGHT" copy={`Level ${levelIndex + 1} delivered in ${levelEggs} ${levelEggs === 1 ? "egg" : "eggs"}.`} action={levelIndex === levels.length - 1 ? "Finish" : "Next level"} onAction={next} success />}
      {phase === "done" && <section className="limit-drop-title complete"><p>FARM COMPLETE</p><h1>{eggsUsed}<br /><strong>DROPS</strong></h1><span>{eggsUsed <= 8 ? "The hens salute your precision." : "The baskets are full. Your models held."}</span><button onClick={() => { setLevelIndex(0); setEggsUsed(0); setLevelEggs(0); setPieces([{ id: "piece-restart-1", expr: "", from: "", to: "" }]); resetEggFor(0); setPhase("playing"); }}>Play again</button></section>}
    </main>
  );
}

function ResultCard({ title, copy, action, onAction, success = false }: { title: string; copy: string; action: string; onAction: () => void; success?: boolean }) {
  return <section className={`limit-drop-result ${success ? "success" : ""}`} onPointerDown={(event) => event.stopPropagation()}><span>{success ? "trajectory complete" : "model needs revision"}</span><h2>{title}</h2><p>{copy}</p><button onClick={onAction}>{action} <Check size={14} /></button></section>;
}

function compilePieces(pieces: Piece[]): { list: CompiledPiece[]; error: string } {
  const list: CompiledPiece[] = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    if (!piece.expr.trim()) continue;
    const compiled = compileExpression(piece.expr);
    if (typeof compiled === "string") return { list: [], error: `Function ${index + 1}: ${compiled}` };
    const lo = piece.from.trim() ? Number(piece.from) : -WORLD_X;
    const hi = piece.to.trim() ? Number(piece.to) : WORLD_X;
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi) return { list: [], error: `Function ${index + 1}: domain start must be less than domain end.` };
    list.push({ fn: compiled, lo: Math.max(-WORLD_X, lo), hi: Math.min(WORLD_X, hi), color: COLORS[index] });
  }
  return { list, error: "" };
}

function compileExpression(source: string): ((x: number) => number) | string {
  const clean = source.trim().toLowerCase();
  if (!/^[0-9a-z+\-*/^().,\s]+$/.test(clean)) return "contains an unsupported character.";
  const names = clean.match(/[a-z]+/g) || [];
  const allowed = new Set(["x", "sin", "cos", "tan", "abs", "sqrt", "exp", "log", "ln", "pi", "e"]);
  if (names.some((name) => !allowed.has(name))) return `unknown name “${names.find((name) => !allowed.has(name))}”.`;
  let js = clean.replace(/\^/g, "**");
  js = js.replace(/\b(sin|cos|tan|abs|sqrt|exp)\b/g, "Math.$1").replace(/\blog\b/g, "Math.log10").replace(/\bln\b/g, "Math.log").replace(/\bpi\b/g, "Math.PI").replace(/\be\b/g, "Math.E");
  js = js.replace(/(\d|x|\))\s*(x|\()/g, "$1*$2").replace(/\)\s*(\d|x)/g, ")*$1");
  try {
    const fn = new Function("x", `"use strict"; return (${js});`) as (x: number) => number;
    const probe = fn(.37);
    if (!Number.isFinite(probe)) return "does not produce a finite number.";
    return fn;
  } catch { return "could not be parsed."; }
}

function simulate(dt: number, level: typeof levels[number], pieces: CompiledPiece[], egg: { x: number; y: number; vx: number; vy: number; mode: "idle" | "falling" | "riding"; piece: number }, trail: Array<[number, number]>, finish: (result: "caught" | "smashed") => void) {
  const steps = 5;
  for (let step = 0; step < steps; step += 1) {
    const h = dt / steps;
    const previousY = egg.y;
    if (egg.mode === "falling") {
      egg.vy -= GRAVITY * h;
      egg.x += egg.vx * h;
      egg.y += egg.vy * h;
      for (let index = 0; index < pieces.length; index += 1) {
        const piece = pieces[index];
        if (egg.x < piece.lo || egg.x > piece.hi) continue;
        const railY = piece.fn(egg.x);
        if (Number.isFinite(railY) && previousY >= railY + .18 && egg.y <= railY + .22 && egg.vy <= 0) {
          egg.mode = "riding"; egg.piece = index; egg.y = railY + .2; egg.vx = Math.max(.65, egg.vx); egg.vy = 0; break;
        }
      }
    } else if (egg.mode === "riding") {
      const piece = pieces[egg.piece];
      if (!piece || egg.x < piece.lo || egg.x > piece.hi) { egg.mode = "falling"; continue; }
      const slope = derivative(piece.fn, egg.x);
      egg.vx = Math.min(7, Math.max(.45, egg.vx + (-GRAVITY * slope / (1 + slope * slope) - .08) * h));
      egg.x += egg.vx * h;
      if (egg.x > piece.hi) { egg.mode = "falling"; egg.vy = slope * egg.vx; continue; }
      const y = piece.fn(egg.x);
      if (!Number.isFinite(y)) { egg.mode = "falling"; continue; }
      egg.y = y + .2;
    }
    trail.push([egg.x, egg.y]);
    if (trail.length > 110) trail.shift();
    if (Math.abs(egg.x - level.basket[0]) < .58 && egg.y >= level.basket[1] && egg.y <= level.basket[1] + 1.25) { finish("caught"); return; }
    if (level.obstacles.some((obstacle) => egg.x > obstacle.x - obstacle.w / 2 - .18 && egg.x < obstacle.x + obstacle.w / 2 + .18 && egg.y > obstacle.y && egg.y < obstacle.y + obstacle.h + .18)) { finish("smashed"); return; }
    if (egg.y < 0 || Math.abs(egg.x) > WORLD_X + 1 || egg.y > WORLD_Y + 3) { finish("smashed"); return; }
  }
}

function derivative(fn: (x: number) => number, x: number) { return (fn(x + .002) - fn(x - .002)) / .004; }

function drawGame(ctx: CanvasRenderingContext2D, rect: DOMRect, level: typeof levels[number], pieces: CompiledPiece[], egg: { x: number; y: number }, trail: Array<[number, number]>, levelIndex: number) {
  const width = rect.width; const height = rect.height;
  const sx = (x: number) => ((x + WORLD_X) / (WORLD_X * 2)) * width;
  const sy = (y: number) => height - 62 - (y / WORLD_Y) * (height - 120);
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#07112b"); sky.addColorStop(.58, "#172749"); sky.addColorStop(1, "#283620"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,244,201,.92)"; ctx.beginPath(); ctx.arc(width * .82, height * .16, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111a35"; for (let i = 0; i < 42; i += 1) { const x = (i * 97) % width; const y = 25 + ((i * 53) % Math.max(40, height * .42)); ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1); }
  ctx.fillStyle = "#1d2d22"; ctx.beginPath(); ctx.moveTo(0, height - 72); for (let x = 0; x <= width; x += 45) ctx.lineTo(x, height - 82 - Math.sin(x * .017) * 13); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
  ctx.strokeStyle = "rgba(186,206,231,.12)"; ctx.lineWidth = 1; for (let x = -10; x <= 10; x += 2) { ctx.beginPath(); ctx.moveTo(sx(x), sy(0)); ctx.lineTo(sx(x), sy(11)); ctx.stroke(); } for (let y = 0; y <= 10; y += 2) { ctx.beginPath(); ctx.moveTo(sx(-12), sy(y)); ctx.lineTo(sx(12), sy(y)); ctx.stroke(); }
  ctx.strokeStyle = "rgba(231,236,244,.32)"; ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(width, sy(0)); ctx.stroke();
  pieces.forEach((piece) => { ctx.strokeStyle = piece.color; ctx.lineWidth = 5; ctx.shadowColor = piece.color; ctx.shadowBlur = 10; ctx.beginPath(); let begun = false; for (let x = piece.lo; x <= piece.hi; x += .035) { const y = piece.fn(x); if (!Number.isFinite(y) || y < -1 || y > 14) { begun = false; continue; } if (!begun) { ctx.moveTo(sx(x), sy(y)); begun = true; } else ctx.lineTo(sx(x), sy(y)); } ctx.stroke(); ctx.shadowBlur = 0; });
  level.obstacles.forEach((obstacle) => drawObstacle(ctx, sx(obstacle.x - obstacle.w / 2), sy(obstacle.y + obstacle.h), sx(obstacle.x + obstacle.w / 2) - sx(obstacle.x - obstacle.w / 2), sy(obstacle.y) - sy(obstacle.y + obstacle.h), obstacle.kind));
  const basketX = sx(level.basket[0]); const basketY = sy(level.basket[1]); ctx.fillStyle = "#ad6c31"; ctx.strokeStyle = "#4c2a12"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(basketX - 24, basketY - 28); ctx.lineTo(basketX + 24, basketY - 28); ctx.lineTo(basketX + 18, basketY + 2); ctx.lineTo(basketX - 18, basketY + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  const henX = sx(level.spawn[0]); const henY = sy(level.spawn[1]); ctx.fillStyle = "#efe6cf"; ctx.beginPath(); ctx.ellipse(henX, henY - 10, 19, 15, -.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#d7503f"; ctx.beginPath(); ctx.arc(henX + 14, henY - 23, 6, 0, Math.PI * 2); ctx.fill();
  if (trail.length > 1) { ctx.strokeStyle = "rgba(255,239,190,.35)"; ctx.lineWidth = 2; ctx.beginPath(); trail.forEach(([x, y], index) => index === 0 ? ctx.moveTo(sx(x), sy(y)) : ctx.lineTo(sx(x), sy(y))); ctx.stroke(); }
  ctx.save(); ctx.translate(sx(egg.x), sy(egg.y)); ctx.fillStyle = "#fff1c5"; ctx.strokeStyle = "#9e7d4a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 9, 12, .15 + levelIndex * .02, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kind: Obstacle["kind"]) {
  ctx.save();
  if (kind === "hay") { ctx.fillStyle = "#bd8b2e"; ctx.strokeStyle = "#70501d"; ctx.lineWidth = 3; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); }
  else if (kind === "barn") { ctx.fillStyle = "#8e302b"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#d6d0bc"; ctx.fillRect(x + w * .36, y + h * .45, w * .28, h * .55); ctx.fillStyle = "#56201d"; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + w / 2, y - h * .3); ctx.lineTo(x + w + 8, y); ctx.fill(); }
  else { ctx.fillStyle = "#79502d"; ctx.fillRect(x, y, w, h); if (kind === "fence") { for (let yy = y + h * .25; yy < y + h; yy += h * .42) ctx.fillRect(x - w * 2, yy, w * 5, 7); } }
  ctx.restore();
}
