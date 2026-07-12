// LIMIT DROP — function-drawing egg physics on a farm at night.
// Type f(x) curves, drop the egg, land it in the basket. SineRider-style, farm edition.
// Single-file React component. React 18 + @react-three/fiber v8 + drei v9 + zustand v4.
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Stars, Trail, Float, Sparkles, useGLTF, useAnimations } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise, N8AO, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import { create } from 'zustand'

// ============================== CONSTANTS ==============================
const WORLD_X = 12            // playfield x ∈ [-12, 12]
const G = 9.8                 // gravity
const H = 1 / 240             // physics substep
const EGG_R = 0.22            // egg collision radius
const MU = 0.05               // sliding friction coefficient
const MAX_SPEED = 25
const MAX_PIECES = 3
const TUBE_RADIUS = 0.09
const PIECE_COLORS = ['#00F5D4', '#F77F00', '#F72585']
const CREAM = '#f5e6c8'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const now = () => performance.now()

// ============================== LEVELS ==============================
// Obstacle AABBs: x = center, y = base (usually 0), w × h. Collision uses these
// exact boxes (expanded by EGG_R) regardless of what the models look like.
// `hint` is the stage-1 written tip; `example` is a verified working solution
// (each entry simulated against the exact physics in this file — all CAUGHT).
const LEVELS = [
  {
    id: 1, title: 'First Flight',
    blurb: 'Type a function on the sign below — build a slide from the hen down to the basket, then hit DROP.',
    spawn: [-7, 7], basket: [6, 0], obstacles: [],
    starterHint: 'try:  6 - 0.45*(x+7)',
    hint: 'Any downhill ramp works. Start just under the hen (y ≈ 6 at x = −7) and slope gently down so the curve reaches the basket at x = 6 while it is still a little above the ground.',
    example: [{ expr: '6 - 0.45*(x+7)' }],
  },
  {
    id: 2, title: 'The Underpass',
    blurb: 'A low barn rafter hangs over the field. No straight ramp threads past it — you will need a curve that dips UNDER the beam and scoops back up into the basket.',
    spawn: [-7, 9], basket: [6, 1.4],
    obstacles: [{ kind: 'beam', x: 2, y: 2, w: 2.4, h: 1.6 }],
    starterHint: 'a straight line always clips the rafter',
    hint: 'Build a valley (a parabola that opens upward): dip the egg low under the rafter, then let the right side lift it into the basket. Something like  a*(x-1.5)^2 + 0.4  with a small a ≈ 0.06 — the egg settles in the dip and rolls into the basket at x = 6.',
    example: [{ expr: '0.06*(x-1.5)^2 + 0.4' }],
  },
  {
    id: 3, title: 'Mind the Hay',
    blurb: 'A hay bale on the left, a rafter overhead, and the basket sits up on a stack. Skim the hay, duck the beam, and climb into the loft.',
    spawn: [-8, 9], basket: [7, 2.2],
    obstacles: [
      { kind: 'beam', x: -0.5, y: 3.2, w: 2.4, h: 2 },
      { kind: 'hay', x: -4, y: 0, w: 1.8, h: 1.3 },
    ],
    starterHint: 'over the hay, under the beam, up to the basket',
    hint: 'Clear the hay on the way down, pass under the rafter in the middle, then let the curve rise into the raised basket at (7, 2.2). A valley whose right arm lifts back up works:  a*(x-2)^2 + 1.2  with a ≈ 0.06.',
    example: [{ expr: '0.06*(x-2)^2 + 1.2' }],
  },
  {
    id: 4, title: 'High Loft',
    blurb: 'Top-shelf delivery. The loft basket is high on a post and a rafter guards the direct line. Dip under, then swing up hard.',
    spawn: [-8, 9.5], basket: [7, 3.2],
    obstacles: [
      { kind: 'beam', x: -1.5, y: 4.4, w: 2.4, h: 2 },
      { kind: 'post', x: 7, y: 0, w: 0.7, h: 1.6 },
    ],
    starterHint: 'no straight line reaches the loft',
    hint: 'Dip under the rafter on the left, then swing UP steeply into the loft basket at (7, 3.2). A steeper valley does it:  a*(x-2)^2 + 1.7  with a ≈ 0.06 — the egg climbs the right arm and drops into the high basket.',
    example: [{ expr: '0.06*(x-2)^2 + 1.7' }],
  },
  {
    id: 5, title: 'Boss Level: The Gauntlet',
    blurb: 'Fence, then the whole barn, basket hiding behind it. One curve may not be enough — use 2 pieces with domains.',
    spawn: [-9, 10], basket: [8, 1],
    obstacles: [
      { kind: 'fence', x: -3, y: 0, w: 0.4, h: 2.5 },
      { kind: 'barn', x: 4, y: 0, w: 3, h: 4 },
      { kind: 'post', x: 8, y: 0, w: 1, h: 0.8 },
    ],
    starterHint: 'piece 1: fly the gap · piece 2: a backboard behind the barn?',
    hint: 'Two pieces: a valley that clears the fence and swoops UP, ending mid-air (set "to" = 2.2) — that ski-jump launches the egg clean over the barn. Then a steep backboard line behind the barn (piece 2, from x = 7) catches the flight and rolls it back down into the basket.',
    example: [
      { expr: '0.12*(x+2)^2 + 3', to: '2.2' },
      { expr: '2*(x-8) + 1', from: '7' },
    ],
  },
]

// ============================== EXPRESSION COMPILER ==============================
// Tokenize → whitelist → implicit multiplication → recursive-descent parse →
// emit fully parenthesized JS → new Function. No raw user text ever reaches eval.
const FN_TABLE = {
  sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan',
  asin: 'Math.asin', acos: 'Math.acos', atan: 'Math.atan',
  abs: 'Math.abs', sqrt: 'Math.sqrt', exp: 'Math.exp',
  log: 'Math.log10', ln: 'Math.log', floor: 'Math.floor',
  ceil: 'Math.ceil', sign: 'Math.sign', min: 'Math.min', max: 'Math.max',
}
const CONST_TABLE = { pi: 'Math.PI', e: 'Math.E' }

function tokenizeExpr(src) {
  const tokens = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      const t = src.slice(i, j)
      if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) throw new Error('bad number "' + t + '"')
      tokens.push({ k: 'num', v: t })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i
      while (j < src.length && /[a-zA-Z_]/.test(src[j])) j++
      const w = src.slice(i, j).toLowerCase()
      i = j
      const own = Object.prototype.hasOwnProperty
      if (w === 'x') { tokens.push({ k: 'x' }); continue }
      if (own.call(CONST_TABLE, w)) { tokens.push({ k: 'const', v: CONST_TABLE[w] }); continue }
      if (own.call(FN_TABLE, w)) { tokens.push({ k: 'fn', v: FN_TABLE[w], name: w }); continue }
      throw new Error('unknown name "' + w + '"')
    }
    if (c === '*' && src[i + 1] === '*') { tokens.push({ k: 'op', v: '^' }); i += 2; continue }
    if ('+-*/^(),'.includes(c)) { tokens.push({ k: 'op', v: c }); i++; continue }
    throw new Error('unexpected "' + c + '"')
  }
  return tokens
}

// Insert * for implicit multiplication: 2x, 2(x+1), x sin(x), (x+1)(x-1), 2pi…
function insertImplicitMult(tokens) {
  const out = []
  for (const t of tokens) {
    const prev = out[out.length - 1]
    const prevAtomEnd = prev && (prev.k === 'num' || prev.k === 'x' || prev.k === 'const' || (prev.k === 'op' && prev.v === ')'))
    const curAtomStart = t.k === 'num' || t.k === 'x' || t.k === 'const' || t.k === 'fn' || (t.k === 'op' && t.v === '(')
    if (prevAtomEnd && curAtomStart) out.push({ k: 'op', v: '*' })
    out.push(t)
  }
  return out
}

function parseToJS(tokens) {
  let i = 0
  const isOp = (v) => tokens[i] && tokens[i].k === 'op' && tokens[i].v === v
  const expect = (v) => { if (!isOp(v)) throw new Error('expected "' + v + '"'); i++ }
  function parseAdd() {
    let l = parseMul()
    while (isOp('+') || isOp('-')) { const op = tokens[i++].v; l = '(' + l + op + parseMul() + ')' }
    return l
  }
  function parseMul() {
    let l = parseUnary()
    while (isOp('*') || isOp('/')) { const op = tokens[i++].v; l = '(' + l + op + parseUnary() + ')' }
    return l
  }
  function parseUnary() {
    if (isOp('-')) { i++; return '(-' + parseUnary() + ')' }
    if (isOp('+')) { i++; return parseUnary() }
    return parsePow()
  }
  function parsePow() {
    const base = parseAtom()
    if (isOp('^')) { i++; return 'Math.pow(' + base + ',' + parseUnary() + ')' } // -x^2 = -(x^2); right-assoc
    return base
  }
  function parseAtom() {
    const t = tokens[i]
    if (!t) throw new Error('unexpected end of expression')
    if (t.k === 'num') { i++; return '(' + t.v + ')' }
    if (t.k === 'x') { i++; return 'x' }
    if (t.k === 'const') { i++; return t.v }
    if (t.k === 'fn') {
      i++
      expect('(')
      const args = [parseAdd()]
      while (isOp(',')) { i++; args.push(parseAdd()) }
      expect(')')
      const variadic = t.name === 'min' || t.name === 'max'
      if (variadic && args.length < 2) throw new Error(t.name + ' needs 2 arguments')
      if (!variadic && args.length !== 1) throw new Error(t.name + ' takes 1 argument')
      return t.v + '(' + args.join(',') + ')'
    }
    if (t.k === 'op' && t.v === '(') { i++; const e = parseAdd(); expect(')'); return '(' + e + ')' }
    throw new Error('unexpected "' + (t.v || t.k) + '"')
  }
  const js = parseAdd()
  if (i < tokens.length) throw new Error('unexpected "' + (tokens[i].v || tokens[i].k) + '"')
  return js
}

function compileExpr(src) {
  if (!src || !src.trim()) return { fn: null, error: null }
  try {
    const tokens = insertImplicitMult(tokenizeExpr(src))
    if (!tokens.length) return { fn: null, error: null }
    const js = parseToJS(tokens)
    // js is fully generated from whitelisted tokens — safe to compile.
    const raw = new Function('x', '"use strict"; return (' + js + ');')
    const probe = raw(0.37)
    if (typeof probe !== 'number') return { fn: null, error: 'not a number' }
    return { fn: raw, error: null }
  } catch (e) {
    return { fn: null, error: (e && e.message) || 'invalid expression' }
  }
}

// ============================== AUDIO (WebAudio helper) ==============================
// Everything routes through masterGain (≈0.5). Mute (music + SFX together) is
// remembered in localStorage. All lazy-init after first user gesture, all try/caught.
let AC = null
let masterGain = null
let rollNodes = null
let lastClickAt = 0
let musicStarted = false
let storedMuted = false
try { storedMuted = window.localStorage.getItem('ld-muted') === '1' } catch (e) { /* private mode */ }

function initAudio() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)()
      masterGain = AC.createGain()
      masterGain.gain.value = storedMuted ? 0 : 0.5
      masterGain.connect(AC.destination)
    }
    if (AC.state === 'suspended') AC.resume()
    startMusic()
  } catch (e) { /* audio unavailable */ }
}
function setMutedAudio(m) {
  storedMuted = m
  try { window.localStorage.setItem('ld-muted', m ? '1' : '0') } catch (e) { /* ignore */ }
  try {
    if (AC && masterGain) masterGain.gain.setTargetAtTime(m ? 0 : 0.5, AC.currentTime, 0.03)
  } catch (e) { /* ignore */ }
}
function startMusic() {
  // Background loop at public/audio/bgm.wav — may not exist yet; fail silently.
  if (musicStarted || !AC || !masterGain) return
  musicStarted = true
  try {
    fetch('/audio/bgm.wav')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('no bgm'))))
      .then((ab) => AC.decodeAudioData(ab))
      .then((buf) => {
        const src = AC.createBufferSource()
        src.buffer = buf
        src.loop = true
        const g = AC.createGain()
        g.gain.value = 0.3
        src.connect(g); g.connect(masterGain)
        src.start()
      })
      .catch(() => { /* bgm not available (yet) — fine */ })
  } catch (e) { /* ignore */ }
}
function tone(freq, delay, dur, type, vol) {
  try {
    if (!AC || !masterGain) return
    const t0 = AC.currentTime + (delay || 0)
    const o = AC.createOscillator()
    const g = AC.createGain()
    o.type = type || 'triangle'
    o.frequency.setValueAtTime(freq, t0)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(masterGain)
    o.start(t0); o.stop(t0 + dur + 0.05)
  } catch (e) { /* ignore */ }
}
function noiseBurst(dur, vol, filterFreq) {
  try {
    if (!AC || !masterGain) return
    const len = Math.floor(AC.sampleRate * dur)
    const buf = AC.createBuffer(1, len, AC.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2)
    const src = AC.createBufferSource()
    src.buffer = buf
    const f = AC.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = filterFreq || 1200
    const g = AC.createGain()
    g.gain.value = vol
    src.connect(f); f.connect(g); g.connect(masterGain)
    src.start()
  } catch (e) { /* ignore */ }
}
function playCluck() {
  // soft hen cluck: short low square wobble
  try {
    if (!AC || !masterGain) return
    const t0 = AC.currentTime
    const o = AC.createOscillator()
    const g = AC.createGain()
    o.type = 'square'
    o.frequency.setValueAtTime(310, t0)
    o.frequency.exponentialRampToValueAtTime(170, t0 + 0.055)
    o.frequency.exponentialRampToValueAtTime(240, t0 + 0.1)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.055, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15)
    o.connect(g); g.connect(masterGain)
    o.start(t0); o.stop(t0 + 0.2)
  } catch (e) { /* ignore */ }
}
let lastWhooshAt = 0
function playWhoosh() {
  // airborne swish: bandpass noise sweeping upward
  try {
    if (!AC || !masterGain) return
    const n = now()
    if (n - lastWhooshAt < 350) return
    lastWhooshAt = n
    const dur = 0.32
    const len = Math.floor(AC.sampleRate * dur)
    const buf = AC.createBuffer(1, len, AC.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI)
    const src = AC.createBufferSource()
    src.buffer = buf
    const f = AC.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.2
    f.frequency.setValueAtTime(480, AC.currentTime)
    f.frequency.exponentialRampToValueAtTime(1700, AC.currentTime + dur)
    const g = AC.createGain()
    g.gain.value = 0.12
    src.connect(f); f.connect(g); g.connect(masterGain)
    src.start()
  } catch (e) { /* ignore */ }
}
function playClick() {
  const n = now()
  if (n - lastClickAt < 60) return
  lastClickAt = n
  tone(660, 0, 0.05, 'square', 0.03)
}
function playPlink() { tone(880, 0, 0.09, 'triangle', 0.08); tone(1320, 0.02, 0.08, 'sine', 0.05) }
function playSplat() { noiseBurst(0.22, 0.3, 900); tone(90, 0, 0.28, 'sine', 0.2); tone(60, 0.04, 0.3, 'sine', 0.14) }
function playCatch() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.11))
  tone(1800, 0.4, 0.07, 'sine', 0.07)
  tone(2200, 0.52, 0.07, 'sine', 0.07)
}
function ensureRoll() {
  try {
    if (!AC || !masterGain || rollNodes) return
    const len = Math.floor(AC.sampleRate * 1.0)
    const buf = AC.createBuffer(1, len, AC.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = AC.createBufferSource()
    src.buffer = buf
    src.loop = true
    const f = AC.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 420
    f.Q.value = 0.8
    const g = AC.createGain()
    g.gain.value = 0
    src.connect(f); f.connect(g); g.connect(masterGain)
    src.start()
    rollNodes = { g }
  } catch (e) { /* ignore */ }
}
function setRollLevel(v) {
  try {
    if (!AC) return
    if (v > 0.001) ensureRoll()
    if (rollNodes) rollNodes.g.gain.setTargetAtTime(v * 0.06, AC.currentTime, 0.05)
  } catch (e) { /* ignore */ }
}

// ============================== EGG SIMULATION (module singleton, mutated in useFrame) ==============================
const SIM = {
  state: 'idle', // idle | falling | sliding | caught | smashed | stalled
  x: 0, y: 0, vx: 0, vy: 0,
  pieceIdx: -1,
  roll: 0,               // accumulated arc distance for roll rotation
  dropT: 0,
  stall: 0, segMin: 0, segMax: 0, lastProg: 0,
  lastX: 0, lastY: 0,    // last finite position (NaN guard)
  shake: 0,
  splat: { active: false, x: 0, y: 0, nx: 0, ny: 1, at: 0 },
  burstSeq: 0, burstX: 0, burstY: 0,
  catchSeq: 0,
  catchFrom: { x: 0, y: 0 }, catchAt: 0,
  hitObstacle: -1,
}

function resetSim(level) {
  SIM.state = 'idle'
  SIM.x = level.spawn[0]
  SIM.y = level.spawn[1]
  SIM.vx = 0; SIM.vy = 0
  SIM.pieceIdx = -1
  SIM.roll = 0
  SIM.dropT = 0
  SIM.stall = 0
  SIM.lastX = SIM.x; SIM.lastY = SIM.y
  SIM.splat.active = false
  SIM.hitObstacle = -1
}

const numDeriv = (f, x) => { const h = 0.001; return (f(x + h) - f(x - h)) / (2 * h) }
const numSecond = (f, x) => { const h = 0.01; return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h) }

// Runtime pieces cache (avoid per-frame allocation): rebuilt only when store pieces change.
const runtimeCache = { src: null, list: [] }
function getRuntimePieces(pieces) {
  if (runtimeCache.src === pieces) return runtimeCache.list
  const list = []
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    if (!p.fn) continue
    let lo = parseFloat(p.from); lo = isFinite(lo) ? Math.max(lo, -WORLD_X) : -WORLD_X
    let hi = parseFloat(p.to); hi = isFinite(hi) ? Math.min(hi, WORLD_X) : WORLD_X
    if (lo >= hi) continue
    list.push({ fn: p.fn, lo, hi, color: PIECE_COLORS[i % PIECE_COLORS.length] })
  }
  runtimeCache.src = pieces
  runtimeCache.list = list
  return list
}

function catchCheck(level, x, y, vy) {
  const bx = level.basket[0], by = level.basket[1]
  return Math.abs(x - bx) < 0.5 && y >= by - 0.05 && y <= by + 0.9 && vy < 0.5
}
function obstacleHit(level, x, y) {
  const obs = level.obstacles
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i]
    const base = o.y || 0
    if (x > o.x - o.w / 2 - EGG_R && x < o.x + o.w / 2 + EGG_R && y > base - EGG_R && y < base + o.h + EGG_R) return i
  }
  return -1
}

function doCatch(level) {
  SIM.state = 'caught'
  SIM.catchFrom.x = SIM.x
  SIM.catchFrom.y = SIM.y
  SIM.catchAt = now()
  SIM.catchSeq++
  setRollLevel(0)
  playCatch()
  useStore.getState().onCaught()
}

function doSmash(reason, obstacleIdx) {
  const level = LEVELS[useStore.getState().levelIndex]
  let px = isFinite(SIM.x) ? clamp(SIM.x, -WORLD_X - 1, WORLD_X + 1) : SIM.lastX
  let py = isFinite(SIM.y) ? SIM.y : SIM.lastY
  let nx = 0, ny = 1
  if (reason === 'stalled') {
    SIM.state = 'stalled'
    setRollLevel(0)
    useStore.getState().onSmashed(reason)
    return
  }
  if (reason === 'obstacle' && obstacleIdx >= 0) {
    const o = level.obstacles[obstacleIdx]
    const base = o.y || 0
    if (py > base + o.h - 0.25) { py = base + o.h + 0.03; ny = 1; nx = 0 } // splat on top
    else { nx = px < o.x ? -1 : 1; ny = 0; px = o.x + nx * (o.w / 2 + 0.04) } // splat on side
    SIM.hitObstacle = obstacleIdx
  } else {
    py = Math.max(py, 0.03)
    if (reason === 'ground') py = 0.03
  }
  SIM.state = 'smashed'
  SIM.splat.active = true
  SIM.splat.x = px
  SIM.splat.y = py
  SIM.splat.nx = nx
  SIM.splat.ny = ny
  SIM.splat.at = now()
  SIM.burstSeq++
  SIM.burstX = px
  SIM.burstY = py + 0.15
  SIM.shake = 1
  setRollLevel(0)
  playSplat()
  useStore.getState().onSmashed(reason)
}

// One fixed substep of the verified physics model.
function substep(level, pieces) {
  if (SIM.state === 'falling') {
    const prevX = SIM.x, prevY = SIM.y
    SIM.vy -= G * H
    SIM.x += SIM.vx * H
    SIM.y += SIM.vy * H
    if (!isFinite(SIM.x) || !isFinite(SIM.y)) { doSmash('ground', -1); return }
    SIM.lastX = SIM.x; SIM.lastY = SIM.y
    if (catchCheck(level, SIM.x, SIM.y, SIM.vy)) { doCatch(level); return }
    const oi = obstacleHit(level, SIM.x, SIM.y)
    if (oi >= 0) { doSmash('obstacle', oi); return }
    if (SIM.y <= 0.15) { doSmash('ground', -1); return }
    if (Math.abs(SIM.x) > WORLD_X + 1) { doSmash('lost', -1); return }
    // Landing: crossed from above y=f(x) to below this substep?
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i]
      if (SIM.x < p.lo || SIM.x > p.hi) continue
      const fNew = p.fn(SIM.x)
      const fPrev = p.fn(clamp(prevX, p.lo, p.hi))
      if (!isFinite(fNew) || !isFinite(fPrev)) continue
      if (prevY >= fPrev - 1e-9 && SIM.y <= fNew) {
        SIM.y = fNew
        const m = clamp(numDeriv(p.fn, SIM.x), -30, 30)
        const inv = Math.sqrt(1 + m * m)
        const vt = (SIM.vx + SIM.vy * m) / inv
        SIM.vx = vt / inv
        SIM.vy = SIM.vx * m
        SIM.state = 'sliding'
        SIM.pieceIdx = i
        SIM.stall = 0
        SIM.segMin = SIM.x; SIM.segMax = SIM.x; SIM.lastProg = SIM.dropT
        playPlink()
        return
      }
    }
  } else if (SIM.state === 'sliding') {
    const p = pieces[SIM.pieceIdx]
    if (!p) { SIM.state = 'falling'; return }
    const m0 = clamp(numDeriv(p.fn, SIM.x), -30, 30)
    let ax = -G * m0 / (1 + m0 * m0)
    if (Math.abs(SIM.vx) > 1e-4) ax -= MU * G / (1 + m0 * m0) * Math.sign(SIM.vx)
    SIM.vx += ax * H
    SIM.vx = clamp(SIM.vx, -MAX_SPEED, MAX_SPEED)
    SIM.x += SIM.vx * H
    SIM.roll += SIM.vx * Math.sqrt(1 + m0 * m0) * H
    // Detach: left the domain or the world.
    if (SIM.x < p.lo || SIM.x > p.hi || Math.abs(SIM.x) > WORLD_X) {
      const bx = clamp(SIM.x, Math.max(p.lo, -WORLD_X), Math.min(p.hi, WORLD_X))
      const mb = clamp(numDeriv(p.fn, bx), -30, 30)
      SIM.y = p.fn(bx) + 0.02
      SIM.vy = SIM.vx * mb
      SIM.state = 'falling'
      if (Math.abs(SIM.vx) > 2) playWhoosh()
      return
    }
    const fy = p.fn(SIM.x)
    if (!isFinite(fy)) { doSmash('ground', -1); return }
    SIM.y = fy
    SIM.vy = SIM.vx * m0
    SIM.lastX = SIM.x; SIM.lastY = SIM.y
    // Detach over sharp crests: needed centripetal accel exceeds gravity's normal component.
    // v²·|f''|/(1+m²)^1.5 > g·cosθ  simplifies to  vx²·|f''| > g  (with f'' < 0, egg on top).
    const f2 = numSecond(p.fn, SIM.x)
    if (f2 < -1e-6 && SIM.vx * SIM.vx * (-f2) > G) {
      SIM.y += 0.02
      SIM.state = 'falling'
      if (Math.abs(SIM.vx) > 2) playWhoosh()
      return
    }
    if (catchCheck(level, SIM.x, SIM.y, SIM.vy)) { doCatch(level); return }
    const oi = obstacleHit(level, SIM.x, SIM.y)
    if (oi >= 0) { doSmash('obstacle', oi); return }
    if (SIM.y <= 0.05) { doSmash('ground', -1); return }
    // Stall detection: no new extreme along this curve segment for a while, or crawling.
    if (SIM.x > SIM.segMax + 0.02) { SIM.segMax = SIM.x; SIM.lastProg = SIM.dropT }
    else if (SIM.x < SIM.segMin - 0.02) { SIM.segMin = SIM.x; SIM.lastProg = SIM.dropT }
    if (Math.abs(SIM.vx) < 0.06) { SIM.stall += H; if (SIM.stall > 1.5) { doSmash('stalled', -1); return } }
    else SIM.stall = 0
    if (SIM.dropT - SIM.lastProg > 3.2) { doSmash('stalled', -1); return }
  }
}

function stepPhysics(delta) {
  const st = useStore.getState()
  if (st.phase !== 'dropping') return
  const level = LEVELS[st.levelIndex]
  const pieces = getRuntimePieces(st.pieces)
  const n = clamp(Math.round(delta * 240), 1, 12)
  for (let k = 0; k < n; k++) {
    if (SIM.state !== 'falling' && SIM.state !== 'sliding') break
    SIM.dropT += H
    substep(level, pieces)
  }
  if ((SIM.state === 'falling' || SIM.state === 'sliding') && SIM.dropT > 15) doSmash('stalled', -1)
  setRollLevel(SIM.state === 'sliding' ? clamp(Math.abs(SIM.vx) / 12, 0, 1) : 0)
}

// ============================== ZUSTAND STORE ==============================
let pieceIdCounter = 0
function makePiece(expr) {
  const c = compileExpr(expr || '')
  return { id: ++pieceIdCounter, expr: expr || '', from: '', to: '', fn: c.fn, error: c.error }
}

const useStore = create((set, get) => ({
  phase: 'title', // title | playing | dropping | caught | smashed | levelComplete | gamedone
  levelIndex: 0,
  eggsUsedTotal: 0,
  eggsUsedLevel: 0,
  pieces: [makePiece('')],
  failReason: null,
  phaseAt: 0,
  muted: storedMuted,

  toggleMute: () => {
    initAudio()
    const m = !get().muted
    setMutedAudio(m)
    set({ muted: m })
    if (!m) playClick()
  },
  applyExample: () => {
    const s = get()
    if (s.phase !== 'playing' && s.phase !== 'smashed') return
    playClick()
    const ex = LEVELS[s.levelIndex].example || []
    const pieces = ex.map((e) => ({ ...makePiece(e.expr), from: e.from || '', to: e.to || '' }))
    set({ pieces: pieces.length ? pieces : [makePiece('')] })
  },

  startGame: () => {
    initAudio()
    playClick()
    resetSim(LEVELS[0])
    set({
      phase: 'playing', levelIndex: 0, eggsUsedTotal: 0, eggsUsedLevel: 0,
      pieces: [makePiece('')], failReason: null, phaseAt: now(),
    })
  },
  drop: () => {
    const s = get()
    if (s.phase !== 'playing' && s.phase !== 'smashed') return
    initAudio()
    playCluck()
    resetSim(LEVELS[s.levelIndex])
    SIM.state = 'falling'
    set({
      phase: 'dropping',
      eggsUsedLevel: s.eggsUsedLevel + 1,
      eggsUsedTotal: s.eggsUsedTotal + 1,
      failReason: null,
      phaseAt: now(),
    })
  },
  retry: () => {
    const s = get()
    if (s.phase !== 'smashed' && s.phase !== 'dropping') return
    playClick()
    resetSim(LEVELS[s.levelIndex])
    set({ phase: 'playing', failReason: null, phaseAt: now() })
  },
  onCaught: () => {
    if (get().phase !== 'dropping') return
    set({ phase: 'caught', phaseAt: now() })
  },
  onSmashed: (reason) => {
    if (get().phase !== 'dropping') return
    set({ phase: 'smashed', failReason: reason, phaseAt: now() })
  },
  showLevelComplete: () => {
    if (get().phase === 'caught') set({ phase: 'levelComplete', phaseAt: now() })
  },
  nextLevel: () => {
    const s = get()
    if (s.phase !== 'caught' && s.phase !== 'levelComplete') return
    playClick()
    const i = s.levelIndex + 1
    if (i >= LEVELS.length) {
      set({ phase: 'gamedone', phaseAt: now() })
    } else {
      resetSim(LEVELS[i])
      set({ phase: 'playing', levelIndex: i, eggsUsedLevel: 0, pieces: [makePiece('')], failReason: null, phaseAt: now() })
    }
  },
  setPieceExpr: (id, expr) => {
    set((s) => ({
      pieces: s.pieces.map((p) => {
        if (p.id !== id) return p
        const c = compileExpr(expr)
        return { ...p, expr, fn: c.fn, error: c.error }
      }),
    }))
  },
  setPieceDomain: (id, key, val) => {
    set((s) => ({ pieces: s.pieces.map((p) => (p.id === id ? { ...p, [key]: val } : p)) }))
  },
  addPiece: () => {
    playClick()
    set((s) => (s.pieces.length >= MAX_PIECES ? s : { pieces: [...s.pieces, makePiece('')] }))
  },
  removePiece: (id) => {
    playClick()
    set((s) => (s.pieces.length <= 1 ? s : { pieces: s.pieces.filter((p) => p.id !== id) }))
  },
}))

// ============================== GLB LOADING (graceful fallback) ==============================
class ModelBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? (this.props.fallback || null) : (
      <Suspense fallback={this.props.fallback || null}>{this.props.children}</Suspense>
    )
  }
}

// Loads a GLB, clones it, scales largest dimension to `size`, centers on bbox
// center; if `ground`, sits the bbox bottom at y = 0 instead. `tweak` (stable
// module-level fn) gets the clone for material adjustments.
function NormalizedGLB({ url, size, ground, tweak }) {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const dim = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(dim.x, dim.y, dim.z) || 1
    const center = box.getCenter(new THREE.Vector3())
    c.position.sub(center)
    if (ground) c.position.y += dim.y / 2
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false } })
    if (tweak) tweak(c)
    const holder = new THREE.Group()
    holder.add(c)
    holder.scale.setScalar(size / maxDim)
    return holder
  }, [scene, size, ground, tweak])
  return <primitive object={obj} />
}

// Warm the moon up: self-lit storybook glow.
const tweakMoon = (obj) => {
  obj.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
      o.material = o.material.clone()
      o.material.emissive = new THREE.Color('#f2e8bc')
      o.material.emissiveIntensity = 0.6
    }
  })
}
// Keep the hen readable at night: kill metalness, add faint self-glow from its own albedo
// so the blue moonlight doesn't swamp it.
const tweakHen = (obj) => {
  obj.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
      o.material = o.material.clone()
      o.material.metalness = 0
      o.material.roughness = 0.85
      o.material.emissive = o.material.color.clone().multiplyScalar(0.28)
      o.material.emissiveMap = o.material.map || null
    }
  })
}
useGLTF.preload('/models/egg.glb')
useGLTF.preload('/models/basket.glb')
useGLTF.preload('/models/chick.glb')
useGLTF.preload('/models/hen.glb')

// ============================== NIGHT FARM ENVIRONMENT ==============================
function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(180, 180, 56, 56)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      const r = Math.hypot(x, z)
      // Flat playfield in the middle, rolling meadow far out.
      const amp = THREE.MathUtils.smoothstep(r, 14, 40) * 1.4
      pos.setY(i, amp * Math.sin(x * 0.21) * Math.cos(z * 0.26) - 0.02)
    }
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} receiveShadow position={[0, 0, 0]}>
      <meshStandardMaterial color="#1a4d2e" roughness={0.95} metalness={0} />
    </mesh>
  )
}

// Soft radial glow texture for the moon halo (built once, lazily).
let _glowTex = null
function getGlowTexture() {
  if (_glowTex) return _glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255, 246, 214, 1)')
  g.addColorStop(0.3, 'rgba(255, 240, 198, 0.5)')
  g.addColorStop(0.7, 'rgba(255, 236, 190, 0.12)')
  g.addColorStop(1, 'rgba(255, 236, 190, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  _glowTex = new THREE.CanvasTexture(c)
  return _glowTex
}

function Moon() {
  const halo = useMemo(() => getGlowTexture(), [])
  return (
    <group position={[15, 15.5, -34]}>
      {/* soft additive halo so the moon reads like a storybook night */}
      <sprite scale={[17, 17, 1]}>
        <spriteMaterial
          map={halo}
          color="#fff3c8"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <ModelBoundary
        fallback={
          <mesh>
            <sphereGeometry args={[3.4, 28, 28]} />
            <meshStandardMaterial color="#f5f0dc" emissive="#f5f0dc" emissiveIntensity={1.1} roughness={0.8} />
          </mesh>
        }
      >
        <NormalizedGLB url="/models/moon.glb" size={7} tweak={tweakMoon} />
      </ModelBoundary>
      <pointLight color="#e7ecff" intensity={0.9} distance={90} />
    </group>
  )
}

function Lantern({ position }) {
  const matRef = useRef()
  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.emissiveIntensity = 1.6 + Math.sin(clock.elapsedTime * 6 + position[0]) * 0.35
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 1.8, 8]} />
        <meshStandardMaterial color="#4a3018" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[0.26, 0.34, 0.26]} />
        <meshStandardMaterial ref={matRef} color="#ffcc66" emissive="#ffaa44" emissiveIntensity={1.6} />
      </mesh>
      <pointLight position={[0, 1.9, 0]} color="#ffaa44" intensity={2} distance={8} decay={2} />
    </group>
  )
}

function ProceduralTree({ scale = 1 }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 2, 7]} />
        <meshStandardMaterial color="#3e2a18" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[1.3, 2.4, 8]} />
        <meshStandardMaterial color="#12351f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[0.9, 1.8, 8]} />
        <meshStandardMaterial color="#164028" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Tree({ position, size = 5, rotY = 0 }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <ModelBoundary fallback={<ProceduralTree scale={size / 5} />}>
        <NormalizedGLB url="/models/tree.glb" size={size} ground />
      </ModelBoundary>
    </group>
  )
}

// Windmill GLB whose blade node (if the graph exposes one) slowly rotates.
function WindmillModel({ size = 9 }) {
  const { scene } = useGLTF('/models/windmill.glb')
  const spinRef = useRef(null)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const dim = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(dim.x, dim.y, dim.z) || 1
    const center = box.getCenter(new THREE.Vector3())
    c.position.sub(center)
    c.position.y += dim.y / 2
    c.traverse((o) => { if (o.isMesh) o.castShadow = true })
    let spin = null
    c.traverse((o) => {
      if (!spin && o.name && /blade|wheel|fan|rotor|propel|sail|wing/i.test(o.name)) spin = o
    })
    spinRef.current = spin // null → blades simply don't turn
    const holder = new THREE.Group()
    holder.add(c)
    holder.scale.setScalar(size / maxDim)
    return holder
  }, [scene, size])
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.z += delta * 0.35
  })
  return <primitive object={obj} />
}

function ProceduralBarn({ w = 6, h = 4 }) {
  const d = w * 0.75
  return (
    <group>
      <mesh position={[0, h * 0.375, 0]} castShadow>
        <boxGeometry args={[w, h * 0.75, d]} />
        <meshStandardMaterial color="#7a2018" roughness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 0.72, h * 0.34, 4]} />
        <meshStandardMaterial color="#4a1410" roughness={0.9} />
      </mesh>
      <mesh position={[0, h * 0.28, d / 2 + 0.02]}>
        <boxGeometry args={[w * 0.28, h * 0.5, 0.05]} />
        <meshStandardMaterial color="#3e2814" roughness={0.9} />
      </mesh>
    </group>
  )
}

function ProceduralWindmill() {
  const bladesRef = useRef()
  useFrame((_, delta) => {
    if (bladesRef.current) bladesRef.current.rotation.z += delta * 0.5
  })
  return (
    <group>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.85, 6, 8]} />
        <meshStandardMaterial color="#5a4028" roughness={0.9} />
      </mesh>
      <group ref={bladesRef} position={[0, 6, 0.6]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 3.6, 0.06]} />
            <meshStandardMaterial color="#c9b896" roughness={0.85} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshStandardMaterial color="#3e2814" />
        </mesh>
      </group>
    </group>
  )
}

function ProceduralFencePanel({ w = 3, h = 1.1 }) {
  return (
    <group>
      {[-w / 2 + 0.15, w / 2 - 0.15].map((x, i) => (
        <mesh key={i} position={[x, h / 2, 0]} castShadow>
          <boxGeometry args={[0.14, h, 0.14]} />
          <meshStandardMaterial color="#5a4028" roughness={0.95} />
        </mesh>
      ))}
      {[0.42, 0.78].map((fy, i) => (
        <mesh key={'r' + i} position={[0, h * fy, 0]} castShadow>
          <boxGeometry args={[w, 0.12, 0.08]} />
          <meshStandardMaterial color="#6b4a2c" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// ============================== PROCEDURAL FARM PROPS ==============================
function Crate({ size = 1, color = '#7a5230' }) {
  return (
    <group>
      <mesh position={[0, size / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* corner/edge slats for a plank-box read */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={sx + '' + sz} position={[sx * size * 0.5, size / 2, sz * size * 0.5]} castShadow>
            <boxGeometry args={[size * 0.1, size * 1.02, size * 0.1]} />
            <meshStandardMaterial color="#4a3018" roughness={0.9} />
          </mesh>
        ))
      )}
      <mesh position={[0, size * 0.5, 0]}>
        <boxGeometry args={[size * 1.01, size * 0.12, size * 1.01]} />
        <meshStandardMaterial color="#4a3018" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Barrel({ r = 0.45, h = 1.1 }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.9, h, 14]} />
        <meshStandardMaterial color="#6b4a2c" roughness={0.85} />
      </mesh>
      {[0.22, 0.5, 0.78].map((f, i) => (
        <mesh key={i} position={[0, h * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.02, 0.035, 8, 20]} />
          <meshStandardMaterial color="#3e2814" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.9, 14]} />
        <meshStandardMaterial color="#54381e" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Pumpkin({ r = 0.4 }) {
  return (
    <group>
      <mesh position={[0, r * 0.8, 0]} scale={[1.25, 0.85, 1.25]} castShadow receiveShadow>
        <sphereGeometry args={[r, 16, 12]} />
        <meshStandardMaterial color="#d9741f" roughness={0.7} />
      </mesh>
      <mesh position={[0, r * 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.22, 6]} />
        <meshStandardMaterial color="#4a6b2a" roughness={0.9} />
      </mesh>
    </group>
  )
}

function WaterTrough() {
  const water = useRef()
  useFrame(({ clock }) => {
    if (water.current) water.current.material.emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 1.5) * 0.08
  })
  return (
    <group>
      {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * 0.92, 0.32, sz * 0.42]} castShadow>
          <boxGeometry args={sx ? [0.12, 0.64, 0.95] : [1.9, 0.64, 0.12]} />
          <meshStandardMaterial color="#5a4028" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[1.9, 0.12, 0.95]} />
        <meshStandardMaterial color="#3e2814" roughness={0.95} />
      </mesh>
      {/* moonlit water */}
      <mesh ref={water} position={[0, 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.7, 0.78]} />
        <meshStandardMaterial color="#22506b" emissive="#5b9fd0" emissiveIntensity={0.28} roughness={0.15} metalness={0.5} />
      </mesh>
    </group>
  )
}

function Scarecrow({ rotY = 0 }) {
  return (
    <group rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 2.2, 6]} />
        <meshStandardMaterial color="#6b4a2c" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 1.5, 6]} />
        <meshStandardMaterial color="#6b4a2c" roughness={0.95} />
      </mesh>
      {/* burlap body */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.3]} />
        <meshStandardMaterial color="#a8853a" roughness={1} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#c9a648" roughness={1} />
      </mesh>
      {/* pointy hat */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[0.28, 0.4, 10]} />
        <meshStandardMaterial color="#4a1410" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Chick({ scale = 1 }) {
  return (
    <group scale={scale}>
      <ModelBoundary
        fallback={
          <group>
            <mesh position={[0, 0.16, 0]} castShadow>
              <sphereGeometry args={[0.17, 12, 10]} />
              <meshStandardMaterial color="#f2d23a" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.34, 0.02]} castShadow>
              <sphereGeometry args={[0.11, 12, 10]} />
              <meshStandardMaterial color="#f5dc55" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.35, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.03, 0.08, 6]} />
              <meshStandardMaterial color="#e8912c" roughness={0.6} />
            </mesh>
          </group>
        }
      >
        <NormalizedGLB url="/models/chick.glb" size={0.5} ground />
      </ModelBoundary>
    </group>
  )
}

// Cheap instanced grass tufts across the meadow for density.
function GrassField() {
  const ref = useRef()
  const count = 300
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.05, 0.55, 4, 1, true)
    g.translate(0, 0.27, 0)
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const rad = 4 + Math.random() * 26
      const x = Math.cos(a) * rad
      const z = -3 + Math.sin(a) * rad * 0.6
      d.position.set(x, 0, z)
      d.rotation.y = Math.random() * Math.PI
      const s = 0.7 + Math.random() * 1.1
      d.scale.set(s, s * (0.7 + Math.random() * 0.8), s)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial color="#3a7d4c" roughness={1} />
    </instancedMesh>
  )
}

// A believable hanging ranch sign the LIMIT DROP title mounts onto.
function TitleSign() {
  return (
    <group position={[0, 0, -0.6]}>
      {/* two tall posts into the ground */}
      {[-6.6, 6.6].map((x) => (
        <mesh key={x} position={[x, 4.1, 0]} castShadow>
          <boxGeometry args={[0.5, 8.2, 0.5]} />
          <meshStandardMaterial color="#5a3d22" roughness={0.95} />
        </mesh>
      ))}
      {/* post caps */}
      {[-6.6, 6.6].map((x) => (
        <mesh key={'c' + x} position={[x, 8.3, 0]} castShadow>
          <boxGeometry args={[0.7, 0.3, 0.7]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
      ))}
      {/* top beam */}
      <mesh position={[0, 8.0, 0]} castShadow>
        <boxGeometry args={[13.8, 0.5, 0.42]} />
        <meshStandardMaterial color="#4a3018" roughness={0.95} />
      </mesh>
      {/* chains holding the board */}
      {[-4.2, 4.2].map((x) => (
        <mesh key={'ch' + x} position={[x, 7.4, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 6]} />
          <meshStandardMaterial color="#2a2a2e" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* the hanging board */}
      <group position={[0, 6.35, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[12.6, 2.9, 0.34]} />
          <meshStandardMaterial color="#6b4423" roughness={0.9} />
        </mesh>
        {/* plank grooves */}
        {[-0.85, 0, 0.85].map((y, i) => (
          <mesh key={i} position={[0, y, 0.18]}>
            <boxGeometry args={[12.6, 0.04, 0.02]} />
            <meshStandardMaterial color="#3e2814" roughness={0.95} />
          </mesh>
        ))}
        {/* frame */}
        {[[0, 1.45], [0, -1.45]].map(([x, y], i) => (
          <mesh key={'fh' + i} position={[x, y, 0.16]} castShadow>
            <boxGeometry args={[12.9, 0.34, 0.3]} />
            <meshStandardMaterial color="#4a3018" roughness={0.92} />
          </mesh>
        ))}
        {[[-6.3, 0], [6.3, 0]].map(([x, y], i) => (
          <mesh key={'fv' + i} position={[x, y, 0.16]} castShadow>
            <boxGeometry args={[0.34, 3.2, 0.3]} />
            <meshStandardMaterial color="#4a3018" roughness={0.92} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function FarmProps() {
  return (
    <group>
      <GrassField />
      {/* Barnyard clutter, stage left near the barn */}
      <group position={[-15.5, 0, -8.5]} rotation={[0, 0.5, 0]}>
        <Crate size={1.2} />
        <group position={[1.1, 0, 0.3]}><Crate size={0.85} color="#6b4423" /></group>
        <group position={[0.4, 1.2, -0.1]}><Crate size={0.7} /></group>
        <group position={[-1.2, 0, 0.6]}><Barrel /></group>
      </group>
      <group position={[-9, 0, -7]}><WaterTrough /></group>
      {/* Pumpkin patch, foreground left */}
      <group position={[-11, 0, 4.5]}>
        <Pumpkin r={0.5} />
        <group position={[0.9, 0, 0.5]}><Pumpkin r={0.38} /></group>
        <group position={[0.4, 0, 1.1]}><Pumpkin r={0.44} /></group>
        <group position={[-0.8, 0, 0.7]}><Pumpkin r={0.32} /></group>
      </group>
      {/* Scarecrow watching the field */}
      <group position={[8.5, 0, -6.5]}><Scarecrow rotY={-0.5} /></group>
      {/* Right-side clutter near the windmill */}
      <group position={[16, 0, -7]} rotation={[0, -0.6, 0]}>
        <Barrel r={0.5} h={1.2} />
        <group position={[1.2, 0, 0.2]}><Crate size={1} /></group>
        <group position={[1.1, 0, 1.3]}><Pumpkin r={0.42} /></group>
      </group>
      {/* A little brood of chicks pecking around */}
      <group position={[-6, 0, 3]}><Chick /></group>
      <group position={[-5.2, 0, 3.4]} rotation={[0, 1.2, 0]}><Chick scale={0.8} /></group>
      <group position={[9.5, 0, 3.5]} rotation={[0, -0.8, 0]}><Chick scale={0.9} /></group>
      {/* Foreground fence run to frame the stage */}
      {[-9, -5, 9, 13].map((x) => (
        <group key={x} position={[x, 0, 6.5]} rotation={[0, Math.PI, 0]}>
          <ModelBoundary fallback={<ProceduralFencePanel w={4} h={1.1} />}>
            <NormalizedGLB url="/models/fence.glb" size={4} ground />
          </ModelBoundary>
        </group>
      ))}
      {/* Extra trees to thicken the treeline */}
      <Tree position={[-23, 0, -8]} size={6.5} rotY={0.3} />
      <Tree position={[22, 0, -11]} size={5.5} rotY={2.1} />
      <Tree position={[-16, 0, 6]} size={4} rotY={1.4} />
      <Tree position={[13, 0, 6]} size={3.6} rotY={0.6} />
    </group>
  )
}

function FarmDressing() {
  return (
    <group>
      {/* Background barn, stage left */}
      <group position={[-17, 0, -11]} rotation={[0, 0.5, 0]}>
        <ModelBoundary fallback={<ProceduralBarn w={7} h={5} />}>
          <NormalizedGLB url="/models/barn.glb" size={8} ground />
        </ModelBoundary>
      </group>
      <Tree position={[-13, 0, -6]} size={5.5} />
      <Tree position={[15, 0, -9]} size={4.5} rotY={1.1} />
      <Tree position={[19, 0, -4]} size={6} rotY={2.4} />
      <Tree position={[-19, 0, -13]} size={7} rotY={0.7} />
      <Tree position={[11, 0, -14]} size={3.6} rotY={3.6} />
      <Tree position={[-7.5, 0, -13.5]} size={4.2} rotY={1.9} />
      {/* Hay pile beside the background barn */}
      <group position={[-13.5, 0, -9]} rotation={[0, 0.4, 0]}>
        <ModelBoundary
          fallback={
            <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.55, 0.55, 1.3, 10]} />
              <meshStandardMaterial color="#c9a648" roughness={1} />
            </mesh>
          }
        >
          <NormalizedGLB url="/models/hay.glb" size={1.5} ground />
        </ModelBoundary>
      </group>
      <group position={[-12.4, 0, -8.2]} rotation={[0, 1.8, 0]}>
        <ModelBoundary
          fallback={
            <mesh position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.42, 0.42, 1, 10]} />
              <meshStandardMaterial color="#b8963e" roughness={1} />
            </mesh>
          }
        >
          <NormalizedGLB url="/models/hay.glb" size={1.1} ground />
        </ModelBoundary>
      </group>
      {/* Windmill far right — blades slow-rotate if the node graph exposes them */}
      <group position={[23, 0, -16]}>
        <ModelBoundary fallback={<ProceduralWindmill />}>
          <WindmillModel size={9} />
        </ModelBoundary>
      </group>
      {/* Far background fence row */}
      {[-15, -11, -7, 7, 11, 15].map((x) => (
        <group key={x} position={[x, 0, -9]}>
          <ModelBoundary fallback={<ProceduralFencePanel w={4} h={1.1} />}>
            <NormalizedGLB url="/models/fence.glb" size={4} ground />
          </ModelBoundary>
        </group>
      ))}
      {/* Lanterns for warm/cool contrast */}
      <Lantern position={[-10.5, 0, 1.5]} />
      <Lantern position={[0.5, 0, -2.5]} />
      <Lantern position={[10.5, 0, 1.5]} />
      {/* Fireflies */}
      <Sparkles count={70} scale={[34, 4, 14]} position={[0, 1.6, -1]} size={2.6} speed={0.28} color="#ffd27a" opacity={0.55} noise={1} />
    </group>
  )
}

// ============================== SPAWN PERCH (hen + roost) ==============================
function ProceduralHen() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} scale={[1, 0.9, 1.25]} castShadow>
        <sphereGeometry args={[0.26, 14, 12]} />
        <meshStandardMaterial color="#f2ede2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0.2]} castShadow>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial color="#f2ede2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.52, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.14, 6]} />
        <meshStandardMaterial color="#e8a13c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.66, 0.18]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#c23b2e" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Rigged hen with idle animation (falls back to the procedural hen via ModelBoundary).
function AnimatedHen() {
  const { scene, animations } = useGLTF('/models/hen.glb')
  const groupRef = useRef()
  const obj = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    const box = new THREE.Box3().setFromObject(c)
    const dim = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(dim.x, dim.y, dim.z) || 1
    const center = box.getCenter(new THREE.Vector3())
    c.position.sub(center)
    c.position.y += dim.y / 2
    c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false } })
    tweakHen(c)
    const holder = new THREE.Group()
    holder.add(c)
    holder.scale.setScalar(0.9 / maxDim)
    return holder
  }, [scene])
  const { actions, names } = useAnimations(animations, groupRef)
  useEffect(() => {
    if (!names || !names.length) return undefined
    const calm = names.find((n) => /idle|stand|look|peck|eat|walk/i.test(n)) || names[0]
    const action = actions && actions[calm]
    if (!action) return undefined
    try {
      action.reset().fadeIn(0.4).play()
      action.timeScale = 0.8
    } catch (e) { /* clip incompatible — hen just stands */ }
    return () => { try { action.fadeOut(0.2) } catch (e) { /* ignore */ } }
  }, [actions, names])
  return (
    <group ref={groupRef}>
      <primitive object={obj} />
    </group>
  )
}

// Elevated wooden coop platform: hen ON the planks, egg resting in a straw nest
// at the spawn point beside her, warm lantern glow so the whole spawn reads clearly.
function HenPerch({ spawn }) {
  const [sx, sy] = spawn
  const platformY = sy - 0.42 // top surface of the planks (egg bobs at sy, bottom ≈ sy - 0.29)
  const lanternMat = useRef()
  useFrame(({ clock }) => {
    if (lanternMat.current) lanternMat.current.emissiveIntensity = 1.8 + Math.sin(clock.elapsedTime * 5.2 + sx) * 0.4
  })
  return (
    <group position={[sx, 0, 0]}>
      {/* four legs */}
      {[[-0.72, -0.34], [0.72, -0.34], [-0.72, 0.34], [0.72, 0.34]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, platformY / 2, lz]} castShadow>
          <boxGeometry args={[0.15, platformY, 0.15]} />
          <meshStandardMaterial color="#54381e" roughness={0.95} />
        </mesh>
      ))}
      {/* cross braces */}
      {[-0.36, 0.36].map((bz, i) => (
        <mesh key={'b' + i} position={[0, platformY * 0.45, bz]} rotation={[0, 0, Math.atan2(platformY * 0.8, 1.44)]} castShadow>
          <boxGeometry args={[Math.hypot(1.44, platformY * 0.8), 0.09, 0.06]} />
          <meshStandardMaterial color="#4a3018" roughness={0.95} />
        </mesh>
      ))}
      {/* platform planks */}
      {[-0.34, 0, 0.34].map((pz, i) => (
        <mesh key={'p' + i} position={[0, platformY - 0.05, pz]} castShadow receiveShadow>
          <boxGeometry args={[2.1, 0.1, 0.3]} />
          <meshStandardMaterial color={i === 1 ? '#7a5230' : '#6b4423'} roughness={0.9} />
        </mesh>
      ))}
      {/* back railing with lantern post */}
      <mesh position={[-0.98, platformY + 0.34, 0]} castShadow>
        <boxGeometry args={[0.09, 0.85, 0.09]} />
        <meshStandardMaterial color="#54381e" roughness={0.95} />
      </mesh>
      <mesh position={[-0.62, platformY + 0.5, 0]} castShadow>
        <boxGeometry args={[0.72, 0.07, 0.07]} />
        <meshStandardMaterial color="#6b4a2c" roughness={0.95} />
      </mesh>
      {/* straw nest right under the egg spawn point */}
      <group position={[0, platformY, 0]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.32, 0.38, 0.1, 14]} />
          <meshStandardMaterial color="#a8853a" roughness={1} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.1, 8, 18]} />
          <meshStandardMaterial color="#c9a648" roughness={1} />
        </mesh>
      </group>
      {/* the hen, standing on the planks beside her egg */}
      <group position={[0.66, platformY, 0.04]} rotation={[0, -Math.PI / 2.6, 0]}>
        <ModelBoundary fallback={<ProceduralHen />}>
          <AnimatedHen />
        </ModelBoundary>
      </group>
      {/* hanging lantern — warm pool over the spawn */}
      <group position={[-0.98, platformY + 0.82, 0]}>
        <mesh>
          <boxGeometry args={[0.2, 0.26, 0.2]} />
          <meshStandardMaterial ref={lanternMat} color="#ffcc66" emissive="#ffaa44" emissiveIntensity={1.8} />
        </mesh>
        <pointLight color="#ffbb55" intensity={2.6} distance={7} decay={2} />
      </group>
      {/* warm fill from the front so hen + egg read against the night */}
      <pointLight position={[0.5, platformY + 1, 1.8]} color="#ffd9a0" intensity={1.2} distance={5.5} decay={2} />
    </group>
  )
}

// ============================== FUNCTION RAILS ==============================
function buildRailGeos(pieces) {
  const built = []
  for (let idx = 0; idx < pieces.length; idx++) {
    const p = pieces[idx]
    if (!p.fn || p.error) continue
    let lo = parseFloat(p.from); lo = isFinite(lo) ? Math.max(lo, -WORLD_X) : -WORLD_X
    let hi = parseFloat(p.to); hi = isFinite(hi) ? Math.min(hi, WORLD_X) : WORLD_X
    if (lo >= hi) continue
    const N = 400
    const samples = []
    for (let i = 0; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N
      let y = NaN
      try { y = p.fn(x) } catch (e) { y = NaN }
      samples.push({ x, y, valid: isFinite(y) && y > -2 && y < 26 })
    }
    const segs = []
    let cur = []
    for (let i = 0; i <= N; i++) {
      const s = samples[i]
      if (!s.valid) { if (cur.length >= 2) segs.push(cur); cur = []; continue }
      if (cur.length > 0 && Math.abs(s.y - cur[cur.length - 1].y) > 3) {
        if (cur.length >= 2) segs.push(cur)
        cur = []
      }
      cur.push(s)
    }
    if (cur.length >= 2) segs.push(cur)
    for (const seg of segs) {
      const pts = seg.map((s) => new THREE.Vector3(s.x, s.y, 0))
      const curve = new THREE.CatmullRomCurve3(pts)
      const tubular = clamp(seg.length, 2, 220)
      const geo = new THREE.TubeGeometry(curve, tubular, TUBE_RADIUS, 8, false)
      const glowGeo = new THREE.TubeGeometry(curve, tubular, TUBE_RADIUS * 2.6, 8, false)
      built.push({
        geo,
        glowGeo,
        color: PIECE_COLORS[idx % PIECE_COLORS.length],
        indexCount: geo.index ? geo.index.count : 0,
        glowIndexCount: glowGeo.index ? glowGeo.index.count : 0,
      })
    }
  }
  return built
}

function Rails() {
  const pieces = useStore((s) => s.pieces)
  const [built, setBuilt] = useState([])
  const builtRef = useRef([])
  const builtAt = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => {
      const next = buildRailGeos(pieces)
      builtRef.current.forEach((b) => { b.geo.dispose(); b.glowGeo.dispose() })
      builtRef.current = next
      builtAt.current = now()
      setBuilt(next)
    }, 150)
    return () => clearTimeout(t)
  }, [pieces])

  useEffect(() => () => {
    builtRef.current.forEach((b) => { b.geo.dispose(); b.glowGeo.dispose() })
    builtRef.current = []
  }, [])

  // Draw-in shimmer after each rebuild.
  useFrame(() => {
    const t = (now() - builtAt.current) / 500
    const list = builtRef.current
    for (let i = 0; i < list.length; i++) {
      const b = list[i]
      if (t >= 1) {
        b.geo.setDrawRange(0, Infinity)
        b.glowGeo.setDrawRange(0, Infinity)
      } else {
        b.geo.setDrawRange(0, Math.floor(clamp(t, 0, 1) * b.indexCount))
        b.glowGeo.setDrawRange(0, Math.floor(clamp(t, 0, 1) * b.glowIndexCount))
      }
    }
  })

  return (
    <group>
      {built.map((b, i) => (
        <group key={i}>
          <mesh geometry={b.geo} castShadow>
            <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.95} roughness={0.3} toneMapped={false} />
          </mesh>
          {/* soft additive halo around the rail */}
          <mesh geometry={b.glowGeo}>
            <meshBasicMaterial
              color={b.color}
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ============================== OBSTACLES ==============================
function HayBale({ w, h }) {
  return (
    <group>
      <ModelBoundary
        fallback={
          <mesh position={[0, h / 2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[h / 2, h / 2, w, 12]} />
            <meshStandardMaterial color="#c9a648" roughness={1} />
          </mesh>
        }
      >
        <NormalizedGLB url="/models/hay.glb" size={Math.max(w, h)} ground />
      </ModelBoundary>
    </group>
  )
}

function FenceObstacle({ w, h }) {
  return (
    <group>
      <ModelBoundary
        fallback={
          <group>
            <mesh position={[0, h / 2, 0]} castShadow>
              <boxGeometry args={[w * 0.55, h, 0.18]} />
              <meshStandardMaterial color="#5a4028" roughness={0.95} />
            </mesh>
            {[0.3, 0.6, 0.9].map((fy, i) => (
              <mesh key={i} position={[0, h * fy, 0.06]} castShadow>
                <boxGeometry args={[w + 0.5, 0.14, 0.09]} />
                <meshStandardMaterial color="#6b4a2c" roughness={0.95} />
              </mesh>
            ))}
          </group>
        }
      >
        <NormalizedGLB url="/models/fence.glb" size={h} ground />
      </ModelBoundary>
    </group>
  )
}

function CrateStack({ w, h }) {
  const n = Math.max(1, Math.round(h / 1.1))
  const each = h / n
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, each * (i + 0.5), 0]} castShadow>
          <boxGeometry args={[w, each * 0.94, w]} />
          <meshStandardMaterial color={i % 2 ? '#6b4a2c' : '#7a5230'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function BarnObstacle({ w, h }) {
  return (
    <group>
      <ModelBoundary fallback={<ProceduralBarn w={w} h={h} />}>
        <NormalizedGLB url="/models/barn.glb" size={h * 1.15} ground />
      </ModelBoundary>
    </group>
  )
}

function Obstacles() {
  const levelIndex = useStore((s) => s.levelIndex)
  const level = LEVELS[levelIndex]
  const glowRefs = useRef([])
  useFrame(({ clock }) => {
    const s = useStore.getState()
    for (let i = 0; i < glowRefs.current.length; i++) {
      const m = glowRefs.current[i]
      if (!m) continue
      const hit = s.phase === 'smashed' && SIM.hitObstacle === i
      m.opacity = hit ? 0.22 + Math.sin(clock.elapsedTime * 8) * 0.1 : 0
    }
  })
  return (
    <group>
      {level.obstacles.map((o, i) => {
        const base = o.y || 0
        return (
          <group key={levelIndex + '-' + i} position={[o.x, base, 0]}>
            {o.kind === 'fence' && <FenceObstacle w={o.w} h={o.h} />}
            {o.kind === 'hay' && <HayBale w={o.w} h={o.h} />}
            {o.kind === 'post' && <CrateStack w={o.w} h={o.h} />}
            {o.kind === 'barn' && <BarnObstacle w={o.w} h={o.h} />}
            {/* Collision AABB — glows red when the egg smashed on it */}
            <mesh position={[0, o.h / 2, 0]}>
              <boxGeometry args={[o.w + EGG_R * 2, o.h + EGG_R, 1.2]} />
              <meshBasicMaterial
                ref={(el) => { glowRefs.current[i] = el }}
                color="#ff2211"
                transparent
                opacity={0}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ============================== BASKET (target) ==============================
function ProceduralBasket() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.3, 0.5, 12, 1, true]} />
        <meshStandardMaterial color="#a87b3f" side={THREE.DoubleSide} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.42, 0.3, 0.5, 12, 1, true]} />
        <meshStandardMaterial color="#6b4a2c" wireframe transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

function ChickPop() {
  const ref = useRef()
  const t = useRef(0)
  useFrame((_, delta) => {
    t.current += delta
    if (!ref.current) return
    const k = Math.min(1, t.current * 2.5)
    const overshoot = 1 + Math.sin(k * Math.PI) * 0.3
    ref.current.scale.setScalar(k * overshoot)
    ref.current.position.y = 0.4 + Math.sin(Math.min(1, t.current) * Math.PI) * 0.18
  })
  return (
    <group ref={ref} position={[0, 0.4, 0]} scale={0}>
      <ModelBoundary
        fallback={
          <group>
            <mesh position={[0, 0.12, 0]}>
              <sphereGeometry args={[0.16, 12, 10]} />
              <meshStandardMaterial color="#ffd94a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.32, 0]}>
              <sphereGeometry args={[0.11, 10, 8]} />
              <meshStandardMaterial color="#ffd94a" roughness={0.8} />
            </mesh>
          </group>
        }
      >
        <NormalizedGLB url="/models/chick.glb" size={0.45} ground />
      </ModelBoundary>
    </group>
  )
}

function BasketTarget() {
  const levelIndex = useStore((s) => s.levelIndex)
  const phase = useStore((s) => s.phase)
  const level = LEVELS[levelIndex]
  const [bx, by] = level.basket
  const ringMat = useRef()
  const beamMat = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ringMat.current) ringMat.current.emissiveIntensity = 0.9 + Math.sin(t * 3.2) * 0.45
    if (beamMat.current) beamMat.current.opacity = 0.1 + Math.sin(t * 2.1) * 0.05
  })
  const showChick = phase === 'caught' || phase === 'levelComplete'
  return (
    <group position={[bx, by, 0]}>
      <ModelBoundary fallback={<ProceduralBasket />}>
        <NormalizedGLB url="/models/basket.glb" size={1.05} ground />
      </ModelBoundary>
      {/* pulsing warm rim */}
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.035, 8, 30]} />
        <meshStandardMaterial ref={ringMat} color="#ffb84d" emissive="#ff9933" emissiveIntensity={1} roughness={0.4} />
      </mesh>
      {/* faint light beam so the target reads at night */}
      <mesh position={[0, 3.2, 0]}>
        <coneGeometry args={[0.75, 6, 16, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color="#ffd9a0"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* dashed vertical aiming guide above the basket */}
      <group position={[0, 1.35, 0]}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <mesh key={i} position={[0, i * 0.8, 0]}>
            <boxGeometry args={[0.055, 0.4, 0.055]} />
            <meshBasicMaterial color="#ffd9a0" transparent opacity={0.3 - i * 0.028} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 1.2, 0.8]} color="#ffbb66" intensity={1.4} distance={5.5} />
      {showChick && <ChickPop />}
    </group>
  )
}

// ============================== EGG ==============================
const ProceduralEgg = (
  <mesh scale={[1, 1.3, 1]} castShadow>
    <sphereGeometry args={[0.22, 20, 20]} />
    <meshStandardMaterial color="#FFFAF0" emissive="#FFE4B5" emissiveIntensity={0.12} roughness={0.35} />
  </mesh>
)

function EggVisual() {
  return (
    <ModelBoundary fallback={ProceduralEgg}>
      <NormalizedGLB url="/models/egg.glb" size={0.58} />
    </ModelBoundary>
  )
}

const _basketTarget = new THREE.Vector3()

function EggActor() {
  const levelIndex = useStore((s) => s.levelIndex)
  const eggsUsedTotal = useStore((s) => s.eggsUsedTotal)
  const phase = useStore((s) => s.phase)
  const groupRef = useRef()
  const visRef = useRef()
  const lightRef = useRef()

  useFrame(({ clock }, delta) => {
    stepPhysics(delta)
    const g = groupRef.current
    if (!g) return
    const s = useStore.getState()
    const level = LEVELS[s.levelIndex]

    if (SIM.state === 'idle') {
      g.visible = true
      g.position.set(SIM.x, SIM.y + Math.sin(clock.elapsedTime * 2) * 0.07, 0)
      if (visRef.current) visRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.12
    } else if (SIM.state === 'falling' || SIM.state === 'sliding' || SIM.state === 'stalled') {
      g.visible = true
      g.position.set(SIM.x, SIM.y + 0.28, 0)
      if (visRef.current) visRef.current.rotation.z = -SIM.roll / 0.3
    } else if (SIM.state === 'caught') {
      g.visible = true
      const k = clamp((now() - SIM.catchAt) / 450, 0, 1)
      const e = 1 - Math.pow(1 - k, 3)
      _basketTarget.set(level.basket[0], level.basket[1] + 0.45, 0)
      g.position.set(
        SIM.catchFrom.x + (_basketTarget.x - SIM.catchFrom.x) * e,
        SIM.catchFrom.y + 0.28 + (_basketTarget.y - SIM.catchFrom.y - 0.28) * e + Math.sin(k * Math.PI) * 0.6,
        0
      )
      if (visRef.current) visRef.current.rotation.z *= 0.9
    } else {
      g.visible = false // smashed — fragments take over
    }
    if (lightRef.current) {
      lightRef.current.position.set(g.position.x, g.position.y + 0.9, 1.6)
      lightRef.current.intensity = g.visible ? 0.8 : 0
    }
  })

  return (
    <group>
      <group ref={groupRef}>
        <Trail key={levelIndex + '-' + eggsUsedTotal + '-' + (phase === 'dropping' ? 1 : 0)} width={0.22} length={6} color="#ffd9a0" attenuation={(w) => w * w}>
          <group ref={visRef}>
            <EggVisual />
          </group>
        </Trail>
      </group>
      <pointLight ref={lightRef} color="#fff2dd" intensity={0.8} distance={6} decay={2} />
    </group>
  )
}

// ============================== SMASH FX ==============================
const FRAG_COUNT = 14
const _fragDummy = new THREE.Object3D()

function ShellBurst() {
  const imRef = useRef()
  const data = useRef({ seq: 0, t: -1, ox: 0, oy: 0, vel: [], spin: [] })

  useFrame((_, delta) => {
    const im = imRef.current
    if (!im) return
    const d = data.current
    if (SIM.burstSeq !== d.seq) {
      d.seq = SIM.burstSeq
      d.t = 0
      d.ox = SIM.burstX
      d.oy = SIM.burstY
      d.vel = []
      d.spin = []
      for (let i = 0; i < FRAG_COUNT; i++) {
        const th = Math.random() * Math.PI * 2
        const sp = 1.2 + Math.random() * 2.6
        d.vel.push([Math.cos(th) * sp, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 1.6])
        d.spin.push([Math.random() * 8, Math.random() * 8, Math.random() * 8])
      }
    }
    if (d.t < 0) { im.visible = false; return }
    im.visible = true
    d.t += delta
    const t = d.t
    const scale = Math.max(0, 1 - t / 1.2)
    for (let i = 0; i < FRAG_COUNT; i++) {
      const v = d.vel[i]
      const py = Math.max(0.03, d.oy + v[1] * t - 4.9 * t * t)
      _fragDummy.position.set(d.ox + v[0] * t, py, v[2] * t)
      _fragDummy.rotation.set(d.spin[i][0] * t, d.spin[i][1] * t, d.spin[i][2] * t)
      _fragDummy.scale.setScalar(scale)
      _fragDummy.updateMatrix()
      im.setMatrixAt(i, _fragDummy.matrix)
    }
    im.instanceMatrix.needsUpdate = true
    if (t > 1.25) d.t = -1
  })

  return (
    <instancedMesh ref={imRef} args={[undefined, undefined, FRAG_COUNT]} frustumCulled={false} visible={false}>
      <coneGeometry args={[0.08, 0.13, 4]} />
      <meshStandardMaterial color="#fffaf0" roughness={0.4} />
    </instancedMesh>
  )
}

function YolkSplat() {
  const ref = useRef()
  useFrame(() => {
    const m = ref.current
    if (!m) return
    if (!SIM.splat.active) { m.visible = false; return }
    m.visible = true
    const t = clamp((now() - SIM.splat.at) / 500, 0, 1)
    const wob = Math.sin(t * 14) * (1 - t) * 0.18
    const flat = 0.5 + (0.15 - 0.5) * t
    const wide = 0.5 + (1.4 - 0.5) * t + wob
    if (SIM.splat.ny > 0.5) {
      m.position.set(SIM.splat.x, SIM.splat.y + 0.06, 0)
      m.rotation.set(0, 0, 0)
    } else {
      m.position.set(SIM.splat.x + SIM.splat.nx * 0.06, SIM.splat.y, 0)
      m.rotation.set(0, 0, SIM.splat.nx > 0 ? -Math.PI / 2 : Math.PI / 2)
    }
    m.scale.set(wide, flat, wide)
  })
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.3, 16, 12]} />
      <meshStandardMaterial color="#ffb020" emissive="#ff8c00" emissiveIntensity={0.25} roughness={0.35} />
    </mesh>
  )
}

const _burstDummy = new THREE.Object3D()
function SuccessBurst() {
  const imRef = useRef()
  const data = useRef({ seq: 0, t: -1, ox: 0, oy: 0 })
  const velocities = useMemo(() => {
    const arr = []
    for (let i = 0; i < 40; i++) {
      const th = Math.random() * Math.PI * 2
      const ph = Math.random() * Math.PI
      const sp = 1.5 + Math.random() * 2.5
      arr.push([Math.sin(ph) * Math.cos(th) * sp, Math.abs(Math.cos(ph)) * sp + 1.4, Math.sin(ph) * Math.sin(th) * sp * 0.4])
    }
    return arr
  }, [])
  useFrame((_, delta) => {
    const im = imRef.current
    if (!im) return
    const d = data.current
    if (SIM.catchSeq !== d.seq) {
      d.seq = SIM.catchSeq
      d.t = 0
      const level = LEVELS[useStore.getState().levelIndex]
      d.ox = level.basket[0]
      d.oy = level.basket[1] + 0.6
    }
    if (d.t < 0) { im.visible = false; return }
    im.visible = true
    d.t += delta
    const t = d.t
    const scale = Math.max(0, 1 - t / 1.4)
    for (let i = 0; i < 40; i++) {
      const v = velocities[i]
      _burstDummy.position.set(d.ox + v[0] * t, d.oy + v[1] * t - 2.45 * t * t, v[2] * t)
      _burstDummy.scale.setScalar(scale)
      _burstDummy.updateMatrix()
      im.setMatrixAt(i, _burstDummy.matrix)
    }
    im.instanceMatrix.needsUpdate = true
    if (t > 1.4) d.t = -1
  })
  return (
    <instancedMesh ref={imRef} args={[undefined, undefined, 40]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1} />
    </instancedMesh>
  )
}

// ============================== CAMERA RIG ==============================
const _camPos = new THREE.Vector3()
const _camLook = new THREE.Vector3()

function CameraRig() {
  const cur = useRef({ pos: new THREE.Vector3(0, 7, 22), look: new THREE.Vector3(0, 4, 0) })
  useFrame(({ camera, clock }, delta) => {
    const s = useStore.getState()
    const level = LEVELS[Math.min(s.levelIndex, LEVELS.length - 1)]
    const t = clock.elapsedTime
    switch (s.phase) {
      case 'title':
        // gentle sway across the front (a full orbit would mirror the 3D title text)
        _camPos.set(Math.sin(t * 0.18) * 9, 6.5 + Math.sin(t * 0.11) * 1.2, 20)
        _camLook.set(0, 3.5, 0)
        break
      case 'dropping': {
        // Loosely follow the egg while keeping the playfield framed.
        const bx = clamp(SIM.x, -WORLD_X, WORLD_X) * 0.5
        const by = clamp(SIM.y, 0, 12) * 0.5 + 2
        _camLook.set(bx, by, 0)
        _camPos.set(bx * 0.6, by * 0.4 + 5, 18)
        break
      }
      case 'caught':
      case 'levelComplete':
        _camPos.set(level.basket[0] * 0.55 + Math.sin(t * 0.25) * 2, level.basket[1] + 3.5, 12)
        _camLook.set(level.basket[0], level.basket[1] + 0.8, 0)
        break
      case 'gamedone':
        _camPos.set(Math.sin(t * 0.15) * 14, 5, Math.cos(t * 0.15) * 14)
        _camLook.set(0, 2.5, 0)
        break
      default: // playing / smashed — cinematic full-playfield framing
        _camPos.set(0, 6, 19)
        _camLook.set(0, 4, 0)
        break
    }
    const k = 1 - Math.pow(0.02, delta) // smooth exponential lerp
    cur.current.pos.lerp(_camPos, k)
    cur.current.look.lerp(_camLook, k)
    camera.position.copy(cur.current.pos)
    // Smash shake: brief decaying jitter.
    if (SIM.shake > 0.003) {
      camera.position.x += (Math.random() * 2 - 1) * 0.15 * SIM.shake
      camera.position.y += (Math.random() * 2 - 1) * 0.15 * SIM.shake
      SIM.shake *= Math.pow(0.001, delta / 0.4)
    }
    camera.lookAt(cur.current.look)
  })
  return null
}

// ============================== TITLE / GAMEDONE 3D ==============================
function TitleGroup() {
  const eggsRef = useRef()
  useFrame(({ clock }) => {
    const g = eggsRef.current
    if (!g) return
    const t = clock.elapsedTime
    g.children.forEach((child, i) => {
      const a = t * 0.4 + (i * Math.PI * 2) / 3
      child.position.set(Math.cos(a) * 5, 3.2 + Math.sin(t * 0.9 + i) * 0.5, Math.sin(a) * 5)
      child.rotation.z = t * 0.7 + i
    })
  })
  return (
    <group>
      <TitleSign />
      <Text position={[0, 6.42, 0.05]} fontSize={1.45} letterSpacing={0.05} color="#fff3d6" outlineWidth={0.05} outlineColor="#7a2018" anchorX="center">
        LIMIT DROP
      </Text>
      <Text position={[0, 4.6, 0]} fontSize={0.34} color="#e8d9b0" anchorX="center">
        a farm-fresh function-drawing egg delivery service
      </Text>
      <group ref={eggsRef}>
        {[0, 1, 2].map((i) => (
          <group key={i} scale={0.9}>
            <EggVisual />
          </group>
        ))}
      </group>
    </group>
  )
}

function GameDoneGroup() {
  const eggsUsedTotal = useStore((s) => s.eggsUsedTotal)
  return (
    <group>
      <Float speed={1.4} floatIntensity={0.3} rotationIntensity={0}>
        <Text position={[0, 5.6, 0]} fontSize={1.1} color="#fff3d6" outlineWidth={0.04} outlineColor="#7a2018" anchorX="center">
          ALL BASKETS FILLED
        </Text>
        <Text position={[0, 4.3, 0]} fontSize={0.42} color="#e8d9b0" anchorX="center">
          {eggsUsedTotal + ' eggs used across the farm'}
        </Text>
      </Float>
    </group>
  )
}

// ============================== SCENE ==============================
// Cinematic post-processing — the single biggest lever on "wow". Bloom makes every
// emissive (rails, moon, lanterns, egg, basket rim) glow; N8AO grounds objects with
// contact shadows; vignette + grain + a whisper of chromatic aberration sell the
// storybook-at-night film look. DOF gently melts the far meadow without touching play.
function Effects() {
  return (
    <EffectComposer multisampling={4} disableNormalPass>
      <N8AO aoRadius={2.2} intensity={2.2} distanceFalloff={1.2} quality="medium" halfRes color="#0a0a1a" />
      {/* Highlight-only bloom: high threshold so lanterns + moon flare, the thin rail
          keeps a tight crisp core instead of blowing out into a fat neon bar. */}
      <Bloom mipmapBlur intensity={0.62} luminanceThreshold={0.55} luminanceSmoothing={0.28} radius={0.5} />
      <DepthOfField focusDistance={0.014} focalLength={0.05} bokehScale={1.6} height={440} />
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0005, 0.0008]} radialModulation modulationOffset={0.35} />
      <Vignette eskil={false} offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
    </EffectComposer>
  )
}

function Scene() {
  const phase = useStore((s) => s.phase)
  const levelIndex = useStore((s) => s.levelIndex)
  const level = LEVELS[levelIndex]
  const gameplay = phase === 'playing' || phase === 'dropping' || phase === 'caught' || phase === 'smashed' || phase === 'levelComplete'
  return (
    <>
      <color attach="background" args={['#0b1026']} />
      <fog attach="fog" args={['#0b1026', 30, 70]} />
      <Stars radius={90} depth={40} count={4000} factor={4} fade speed={0.4} />
      {/* night sky/ground bounce + dim blue ambient + moonlight */}
      <hemisphereLight args={['#4a5a8a', '#2d4a2d', 0.55]} />
      <ambientLight intensity={0.22} color="#7788ff" />
      <directionalLight
        castShadow
        color="#bfd0ff"
        intensity={1.1}
        position={[8, 14, 6]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-4}
        shadow-camera-near={2}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
      />
      <CameraRig />
      <Ground />
      <Moon />
      <FarmDressing />
      <FarmProps />
      {phase === 'title' && <TitleGroup />}
      {phase === 'gamedone' && <GameDoneGroup />}
      {gameplay && (
        <group>
          <HenPerch key={levelIndex} spawn={level.spawn} />
          <Rails />
          <Obstacles />
          <BasketTarget />
          <EggActor />
          <ShellBurst />
          <YolkSplat />
          <SuccessBurst />
        </group>
      )}
    </>
  )
}

// ============================== HUD (farm-styled HTML overlay) ==============================
const DISPLAY_FONT = "'Rye', Georgia, 'Times New Roman', serif"
const BODY_FONT = "'Patrick Hand', 'Segoe Print', 'Comic Sans MS', Georgia, cursive"
const CHALK_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const HUD_CSS = `
.ld-wood {
  background:
    radial-gradient(circle at 11px 11px, #241505 3px, rgba(0,0,0,0) 4.5px),
    radial-gradient(circle at calc(100% - 11px) 11px, #241505 3px, rgba(0,0,0,0) 4.5px),
    radial-gradient(circle at 11px calc(100% - 11px), #241505 3px, rgba(0,0,0,0) 4.5px),
    radial-gradient(circle at calc(100% - 11px) calc(100% - 11px), #241505 3px, rgba(0,0,0,0) 4.5px),
    linear-gradient(180deg, rgba(255,235,200,0.07), rgba(0,0,0,0.12)),
    repeating-linear-gradient(180deg, #7a5230 0px 24px, #6b4423 24px 27px);
  border: 4px solid #3e2814;
  border-radius: 10px;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.45), 0 6px 18px rgba(0,0,0,0.6);
  color: ${CREAM};
  font-family: ${BODY_FONT};
  transition: opacity 200ms ease, transform 200ms ease;
}
.ld-head {
  font-family: ${DISPLAY_FONT};
  font-weight: 400;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 3px rgba(0,0,0,0.55);
}
.ld-chalk {
  background: linear-gradient(180deg, #232830, #1c2028);
  color: #f2f4ee;
  font-family: ${CHALK_FONT};
  border: 1.5px dashed #7f8894;
  border-radius: 6px;
  padding: 6px 8px;
  outline: none;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.ld-chalk::placeholder { color: #8b94a2; opacity: 0.8; }
.ld-chalk:focus { border-color: ${CREAM}; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 0 8px rgba(245,230,200,0.25); }
.ld-chalk.ld-err { border-color: tomato; animation: ldShake 220ms ease; }
@keyframes ldShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(2px); }
  75% { transform: translateX(-2px); }
}
.ld-live {
  font-family: ${CHALK_FONT};
  font-size: 9px;
  letter-spacing: 1px;
  padding: 2px 5px;
  border-radius: 4px;
  flex: none;
  width: 40px;
  text-align: center;
  transition: all 200ms ease;
}
.ld-live.on { color: #7dffce; border: 1px solid rgba(125,255,206,0.5); text-shadow: 0 0 6px rgba(125,255,206,0.7); }
.ld-live.err { color: tomato; border: 1px solid rgba(255,99,71,0.5); }
.ld-live.off { color: #8b94a2; border: 1px solid rgba(139,148,162,0.3); }
.ld-plank {
  cursor: pointer;
  font-family: ${DISPLAY_FONT};
  font-weight: 400;
  color: ${CREAM};
  background:
    linear-gradient(180deg, rgba(255,235,200,0.08), rgba(0,0,0,0.14)),
    repeating-linear-gradient(180deg, #7a5230 0px 14px, #6b4423 14px 16px);
  border: 2.5px solid #3e2814;
  border-radius: 7px;
  padding: 7px 14px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  box-shadow: 0 3px 8px rgba(0,0,0,0.5);
  transition: transform 200ms ease, filter 200ms ease, box-shadow 200ms ease;
}
.ld-plank:hover { filter: brightness(1.15); transform: translateY(-1px); box-shadow: 0 5px 12px rgba(0,0,0,0.55); }
.ld-plank:active { transform: translateY(1px); }
.ld-plank:disabled { opacity: 0.45; cursor: default; }
.ld-hintbox {
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(20, 14, 6, 0.55);
  border: 1.5px solid #3e2814;
  border-radius: 7px;
  font-size: 13.5px;
  line-height: 1.45;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.4);
  animation: ldFadeIn 250ms ease;
}
@keyframes ldFadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
.ld-mutebtn {
  cursor: pointer;
  width: 42px; height: 42px;
  font-size: 18px; line-height: 1;
  padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.ld-dropbtn {
  cursor: pointer;
  width: 96px; height: 96px; border-radius: 50%;
  background: radial-gradient(circle at 35% 28%, #e05a40, #a3271d 65%, #7a2018 100%);
  border: 5px solid ${CREAM};
  box-shadow: 0 0 0 4px #7a2018, 0 8px 18px rgba(0,0,0,0.6);
  color: #fff;
  font-family: ${DISPLAY_FONT};
  font-weight: 400; font-size: 19px; letter-spacing: 1.5px;
  text-shadow: 0 2px 3px rgba(0,0,0,0.5);
  animation: ldPulse 1.7s ease-in-out infinite;
  transition: transform 200ms ease;
}
.ld-dropbtn:hover { transform: scale(1.05); }
.ld-dropbtn:disabled { opacity: 0.4; animation: none; cursor: default; }
@keyframes ldPulse {
  0%, 100% { box-shadow: 0 0 0 4px #7a2018, 0 8px 18px rgba(0,0,0,0.6); }
  50% { box-shadow: 0 0 0 4px #7a2018, 0 0 26px rgba(255,140,60,0.8), 0 8px 18px rgba(0,0,0,0.6); }
}
@keyframes ldSwing {
  0% { transform: translateX(-50%) rotate(-7deg); opacity: 0; }
  55% { transform: translateX(-50%) rotate(3deg); opacity: 1; }
  80% { transform: translateX(-50%) rotate(-1.8deg); }
  100% { transform: translateX(-50%) rotate(-0.7deg); opacity: 1; }
}
.ld-card { animation: ldSwing 650ms ease-out forwards; transform-origin: top center; }
.ld-xbtn {
  cursor: pointer; border: none; background: #4a2c14; color: ${CREAM};
  border-radius: 5px; width: 26px; height: 26px; font-size: 15px; line-height: 1;
  flex: none;
  transition: filter 200ms ease;
}
.ld-xbtn:hover { filter: brightness(1.4); }
.ld-vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 52%, rgba(4,6,18,0.42) 100%);
}
@media (max-width: 640px) {
  .ld-editor { left: 6px !important; right: 6px !important; bottom: 6px !important; transform: none !important; width: auto !important; max-width: none !important; }
  .ld-dropwrap { right: 10px !important; bottom: 215px !important; }
  .ld-sign { max-width: 60vw !important; font-size: 12px !important; }
  .ld-hintbox { font-size: 12px !important; }
  .ld-title3d { display: none; }
}
`

function PieceRow({ piece, index }) {
  const st = useStore.getState()
  const canRemove = useStore((s) => s.pieces.length > 1)
  const lo = parseFloat(piece.from)
  const hi = parseFloat(piece.to)
  const domainErr = isFinite(lo) && isFinite(hi) && lo >= hi ? '"from" must be less than "to"' : null
  const level = LEVELS[useStore.getState().levelIndex]
  const sub = ['₁', '₂', '₃'][index] || ''
  const hasExpr = !!piece.expr.trim()
  const liveState = !hasExpr ? 'off' : piece.error || domainErr ? 'err' : 'on'
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{
          width: 14, height: 14, borderRadius: 4, flex: 'none',
          background: PIECE_COLORS[index % PIECE_COLORS.length],
          boxShadow: '0 0 8px ' + PIECE_COLORS[index % PIECE_COLORS.length],
          transition: 'box-shadow 200ms ease',
        }} />
        <span style={{ fontFamily: CHALK_FONT, fontSize: 14, whiteSpace: 'nowrap', color: CREAM, width: 58, flex: 'none' }}>
          {'f' + sub + '(x) ='}
        </span>
        <input
          className={'ld-chalk' + (piece.error ? ' ld-err' : '')}
          style={{ flex: 1, minWidth: 60, fontSize: 14 }}
          type="text"
          spellCheck={false}
          autoComplete="off"
          placeholder={index === 0 ? level.starterHint : 'e.g. 2*sin(x/2)+3'}
          value={piece.expr}
          onChange={(e) => st.setPieceExpr(piece.id, e.target.value)}
        />
        <span className={'ld-live ' + liveState} aria-hidden={liveState === 'off'} style={{ visibility: liveState === 'off' ? 'hidden' : 'visible' }}>
          {liveState === 'on' ? '● LIVE' : '✕ ERR'}
        </span>
        <span style={{ fontSize: 12, opacity: 0.8, flex: 'none' }}>from</span>
        <input
          className={'ld-chalk' + (domainErr ? ' ld-err' : '')}
          style={{ width: 46, fontSize: 12, padding: '6px 4px', textAlign: 'center', flex: 'none' }}
          type="text"
          inputMode="decimal"
          placeholder="−∞"
          value={piece.from}
          onChange={(e) => st.setPieceDomain(piece.id, 'from', e.target.value)}
        />
        <span style={{ fontSize: 12, opacity: 0.8, flex: 'none' }}>to</span>
        <input
          className={'ld-chalk' + (domainErr ? ' ld-err' : '')}
          style={{ width: 46, fontSize: 12, padding: '6px 4px', textAlign: 'center', flex: 'none' }}
          type="text"
          inputMode="decimal"
          placeholder="+∞"
          value={piece.to}
          onChange={(e) => st.setPieceDomain(piece.id, 'to', e.target.value)}
        />
        <button
          className="ld-xbtn"
          style={{ visibility: canRemove ? 'visible' : 'hidden' }}
          onClick={() => st.removePiece(piece.id)}
          title="remove piece"
        >
          ×
        </button>
      </div>
      {(piece.error || domainErr) && (
        <div style={{ color: 'tomato', fontSize: 12, marginTop: 3, marginLeft: 21, fontFamily: CHALK_FONT }}>
          {piece.error || domainErr}
        </div>
      )}
    </div>
  )
}

function HUD() {
  const phase = useStore((s) => s.phase)
  const levelIndex = useStore((s) => s.levelIndex)
  const eggsUsedTotal = useStore((s) => s.eggsUsedTotal)
  const eggsUsedLevel = useStore((s) => s.eggsUsedLevel)
  const pieces = useStore((s) => s.pieces)
  const failReason = useStore((s) => s.failReason)
  const muted = useStore((s) => s.muted)
  const st = useStore.getState()
  const level = LEVELS[levelIndex]
  const inGame = phase === 'playing' || phase === 'dropping' || phase === 'caught' || phase === 'smashed' || phase === 'levelComplete'
  const canEdit = phase === 'playing' || phase === 'smashed'
  const canDrop = phase === 'playing' || phase === 'smashed'
  const stalled = failReason === 'stalled'

  // Two-stage hint: 1 = written tip, 2 = concrete working answer. Resets per level.
  const [hintStage, setHintStage] = useState(0)
  useEffect(() => { setHintStage(0) }, [levelIndex])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{HUD_CSS}</style>

      {/* soft night vignette over the whole viewport */}
      <div className="ld-vignette" />

      {/* ---- Top-left: level sign (with hint system) ---- */}
      {inGame && (
        <div className="ld-wood ld-sign" style={{
          position: 'absolute', top: 14, left: 14, padding: '12px 18px', maxWidth: 360,
          pointerEvents: 'auto',
        }}>
          <div className="ld-head" style={{ fontSize: 17 }}>
            {'Level ' + level.id + ' — ' + level.title}
          </div>
          <div style={{ fontSize: 14, marginTop: 5, lineHeight: 1.45, opacity: 0.92 }}>
            {level.blurb}
          </div>
          <div style={{ marginTop: 9 }}>
            <button
              className="ld-plank"
              style={{ fontSize: 12, padding: '4px 11px' }}
              onClick={() => { initAudio(); playClick(); setHintStage((h) => (h >= 2 ? 0 : h + 1)) }}
            >
              {hintStage === 0 ? '💡 Hint' : hintStage === 1 ? '💡 Show me one answer' : 'Hide hints'}
            </button>
          </div>
          {hintStage >= 1 && (
            <div className="ld-hintbox">{level.hint}</div>
          )}
          {hintStage >= 2 && (
            <div className="ld-hintbox" style={{ background: 'rgba(24, 28, 36, 0.75)' }}>
              {(level.example || []).map((e, i) => (
                <div key={i} style={{ fontFamily: CHALK_FONT, fontSize: 12.5, color: PIECE_COLORS[i % PIECE_COLORS.length] }}>
                  {'f' + (['₁', '₂', '₃'][i] || '') + '(x) = ' + e.expr
                    + (e.from ? '   from ' + e.from : '') + (e.to ? '   to ' + e.to : '')}
                </div>
              ))}
              <button
                className="ld-plank"
                style={{ fontSize: 11, padding: '3px 10px', marginTop: 7 }}
                disabled={!canEdit}
                onClick={() => st.applyExample()}
              >
                ✏️ use it
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- Top-right: egg counter + level dots + mute ---- */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      }}>
        {inGame && (
          <div className="ld-wood" style={{ padding: '10px 16px', textAlign: 'right' }}>
            <div className="ld-head" style={{ fontSize: 14 }}>
              {'🥚 Eggs used: ' + eggsUsedLevel}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>{'total ' + eggsUsedTotal}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 7 }}>
              {LEVELS.map((l, i) => (
                <span key={l.id} style={{
                  width: 11, height: 11, borderRadius: '50%',
                  background: i < levelIndex ? '#FFD700' : i === levelIndex ? CREAM : '#3e2814',
                  border: '2px solid #2e1c0c',
                  transition: 'background 200ms ease',
                }} />
              ))}
            </div>
          </div>
        )}
        <button
          className="ld-plank ld-mutebtn"
          style={{ pointerEvents: 'auto' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); st.toggleMute() }}
          title={muted ? 'unmute music & sounds' : 'mute music & sounds'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* ---- Bottom: function editor (chalkboard nailed to a barn wall) ---- */}
      {inGame && (
        <div className="ld-wood ld-editor" style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          width: 'min(620px, 92vw)', padding: '12px 16px',
          pointerEvents: 'auto',
          opacity: canEdit ? 1 : 0.55,
        }}>
          <div className="ld-head" style={{ fontSize: 12, marginBottom: 8, letterSpacing: 1.5, opacity: 0.9 }}>
            CHICKEN SCRATCH — draw your rails
          </div>
          {pieces.map((p, i) => <PieceRow key={p.id} piece={p} index={i} />)}
          {pieces.length < MAX_PIECES && (
            <button className="ld-plank" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => st.addPiece()}>
              + add function
            </button>
          )}
        </div>
      )}

      {/* ---- Right: DROP button ---- */}
      {inGame && (
        <div className="ld-dropwrap" style={{ position: 'absolute', right: 22, bottom: 130, textAlign: 'center', pointerEvents: 'auto' }}>
          <button className="ld-dropbtn" disabled={!canDrop} onClick={() => st.drop()}>
            DROP
          </button>
          <div style={{ fontFamily: BODY_FONT, color: CREAM, fontSize: 12.5, marginTop: 7, textShadow: '0 1px 3px #000' }}>
            SPACE = drop · R = retry · M = mute
          </div>
        </div>
      )}

      {/* ---- Result card: SPLAT / STUCK ---- */}
      {phase === 'smashed' && (
        <div key={st.phaseAt} className="ld-wood ld-card" style={{
          position: 'absolute', top: '17%', left: '50%', transform: 'translateX(-50%)',
          padding: '18px 30px', textAlign: 'center', minWidth: 260, maxWidth: 420,
        }}>
          <div className="ld-head" style={{ fontSize: 30, color: stalled ? '#f0c96a' : '#ff8866', textShadow: '0 2px 4px #000', letterSpacing: 2 }}>
            {stalled ? 'STUCK!' : 'SPLAT!'}
          </div>
          <div style={{ fontSize: 15, marginTop: 8, lineHeight: 1.45 }}>
            {stalled
              ? 'The egg settled in for a nap on your curve. Reshape it so gravity keeps things moving.'
              : failReason === 'obstacle'
                ? 'Right into the woodwork. Steer your curve clear of the red zone.'
                : 'Scrambled. Tweak your function — the curves stay right where you drew them.'}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center', pointerEvents: 'auto' }}>
            <button className="ld-plank" onClick={() => st.retry()}>RETRY (R)</button>
            <button className="ld-plank" onClick={() => st.drop()}>DROP AGAIN (SPACE)</button>
          </div>
        </div>
      )}

      {/* ---- Result card: CAUGHT / level complete ---- */}
      {(phase === 'caught' || phase === 'levelComplete') && (
        <div key={levelIndex} className="ld-wood ld-card" style={{
          position: 'absolute', top: '17%', left: '50%', transform: 'translateX(-50%)',
          padding: '18px 30px', textAlign: 'center', minWidth: 280, maxWidth: 420,
        }}>
          <div className="ld-head" style={{ fontSize: 30, color: '#9dedC8', textShadow: '0 2px 4px #000', letterSpacing: 2 }}>
            CAUGHT!
          </div>
          <div style={{ fontSize: 15, marginTop: 8 }}>
            {'Level ' + level.id + ' delivered in ' + eggsUsedLevel + (eggsUsedLevel === 1 ? ' egg' : ' eggs') + '.'}
            {eggsUsedLevel === 1 ? ' Flawless farming.' : ''}
          </div>
          {phase === 'levelComplete' && (
            <div style={{ marginTop: 14, pointerEvents: 'auto' }}>
              <button className="ld-plank" style={{ fontSize: 15 }} onClick={() => st.nextLevel()}>
                {levelIndex + 1 >= LEVELS.length ? 'FINISH ▸ (ENTER)' : 'NEXT LEVEL ▸ (ENTER)'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- Title overlay: hanging sign ---- */}
      {phase === 'title' && (
        <div style={{ position: 'absolute', left: '50%', top: '58%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 120 }}>
            <div style={{ width: 3, height: 42, background: '#8a6a3a', boxShadow: '0 2px 4px #000' }} />
            <div style={{ width: 3, height: 42, background: '#8a6a3a', boxShadow: '0 2px 4px #000' }} />
          </div>
          <div className="ld-wood" style={{ padding: '16px 30px', display: 'inline-block' }}>
            <div className="ld-head" style={{ fontSize: 16, letterSpacing: 1 }}>
              type functions · drop eggs · fill baskets
            </div>
            <div style={{ fontSize: 14.5, marginTop: 8, opacity: 0.85 }}>
              press ENTER or click to open the farm
            </div>
          </div>
        </div>
      )}

      {/* ---- Game complete ---- */}
      {phase === 'gamedone' && (
        <div className="ld-wood ld-card" style={{
          position: 'absolute', top: '55%', left: '50%', transform: 'translateX(-50%)',
          padding: '20px 34px', textAlign: 'center',
        }}>
          <div className="ld-head" style={{ fontSize: 22 }}>{'🥚 × ' + eggsUsedTotal}</div>
          <div style={{ fontSize: 15, marginTop: 6, opacity: 0.9 }}>
            {eggsUsedTotal <= 7 ? 'Barely a yolk spilled. The hens salute you.'
              : eggsUsedTotal <= 14 ? 'A respectable morning on the farm.'
                : 'The chickens have filed a complaint, but the baskets are full.'}
          </div>
          <div style={{ marginTop: 14, pointerEvents: 'auto' }}>
            <button className="ld-plank" style={{ fontSize: 15 }} onClick={() => st.startGame()}>
              PLAY AGAIN (ENTER)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================== ROOT ==============================
export default function LimitDrop() {
  const phase = useStore((s) => s.phase)
  const phaseAt = useStore((s) => s.phaseAt)

  // Global keyboard controls — ignored while typing in the function editor.
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
    }
    const onKey = (e) => {
      if (isTyping()) {
        if (e.key === 'Enter') e.target.blur()
        return
      }
      const s = useStore.getState()
      if (e.code === 'Space') e.preventDefault()
      if (e.key === 'm' || e.key === 'M') { s.toggleMute(); return }
      switch (s.phase) {
        case 'title':
          if (e.code === 'Enter' || e.code === 'Space') s.startGame()
          break
        case 'playing':
        case 'smashed':
          if (e.code === 'Space' || e.code === 'Enter') s.drop()
          else if (e.key === 'r' || e.key === 'R') s.retry()
          break
        case 'dropping':
          if (e.key === 'r' || e.key === 'R') s.retry()
          break
        case 'caught':
        case 'levelComplete':
          if (e.code === 'Enter' || e.code === 'Space') s.nextLevel()
          break
        case 'gamedone':
          if (e.code === 'Enter' || e.code === 'Space') s.startGame()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // caught → levelComplete card after a beat (StrictMode-safe: cleanup clears timer).
  useEffect(() => {
    if (phase !== 'caught') return undefined
    const id = setTimeout(() => useStore.getState().showLevelComplete(), 1300)
    return () => clearTimeout(id)
  }, [phase, phaseAt])

  const onPointerDown = () => {
    initAudio()
    if (useStore.getState().phase === 'title') useStore.getState().startGame()
  }

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0b1026',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.18, powerPreference: 'high-performance' }}
        camera={{ position: [0, 6, 19], fov: 50 }}
      >
        <Scene />
        <Effects />
      </Canvas>
      <HUD />
    </div>
  )
}
