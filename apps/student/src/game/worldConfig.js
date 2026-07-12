// ---------------------------------------------------------------------------
// WORLD CONFIG — the physical layout of the lesson facility.
//
// The lesson spec (dnaTranscription.js) owns the CONTENT of each slide/phase.
// This file owns WHERE that content lives: one room per phase, chained into a
// big multi-level facility. Rooms are joined by corridors with locked doors and
// staircases, so the student literally walks the lesson and must clear each
// room to unlock the next. worldGeometry.js turns this chain into collision +
// renderable geometry.
//
// Rooms are dressed with real low-poly models sourced from Poly Pizza (CC-BY /
// CC0 — see public/assets/models/polypizza/attributions.json).
// ---------------------------------------------------------------------------
import { buildWorld } from './worldGeometry.js';

export const WORLD = {
  eyeHeight: 1.7,
  moveSpeed: 6.2,
  spawn: [0, 1.7, 6.5], // just inside the first room, facing the exit
};

// Draw distance. Fog swallows geometry just before the far plane clips it, and
// the same number drives distance culling in Lab.jsx — anything the fog has
// fully hidden is unmounted rather than rendered.
export const VIEW = { fogNear: 22, fogEnd: 70, far: 80 };

// Poly Pizza model kit (downloaded to /public/assets/models/polypizza).
const POLY = {
  desk: '/assets/models/polypizza/lab-desk.glb',
  equipment: '/assets/models/polypizza/lab-equipment.glb',
  flask: '/assets/models/polypizza/flask.glb',
  beaker: '/assets/models/polypizza/beaker.glb',
  plant: '/assets/models/polypizza/plant.glb',
  stool: '/assets/models/polypizza/stool.glb',
  monitor: '/assets/models/polypizza/monitor.glb',
};

// Place props relative to a room centre so the numbers stay readable.
const at = (cx, cz, dx, dz) => [cx + dx, cz + dz];

// --- The room chain ---------------------------------------------------------
// Each room maps to a phaseId in the lesson spec. `props` describes what the
// renderer places inside; `decor` are Poly Pizza set-dressing models.
export const ROOMS = [
  {
    id: 'arrival',
    phaseId: 'p1-arrival',
    title: 'Containment Airlock',
    center: [0, 0],
    size: [22, 18],
    floorY: 0,
    accent: '#5eead4',
    placard: {
      heading: 'SPECIMEN VAULT · Orientation',
      body: 'A strand of real human DNA floats in the capsule ahead. Walk up to inspect it, then step through the airlock to begin.',
    },
    props: {
      capsules: [
        { id: 'dna', label: 'HUMAN DNA', sub: 'Specimen 01 · ACTIVE', pos: at(0, 0, 0, -3), radius: 1.7, height: 5.2, color: '#5eead4', model: '/assets/models/dna_helix.glb', specimen: 'dna', active: true },
        { id: 'cell', label: 'ANIMAL CELL', sub: 'Specimen 02 · LOCKED', pos: at(0, 0, -8, -2), radius: 1.2, height: 4.2, color: '#a78bfa', model: null, specimen: 'cell', locked: true },
        { id: 'protein', label: 'PROTEIN FOLD', sub: 'Specimen 03 · LOCKED', pos: at(0, 0, 8, -2), radius: 1.2, height: 4.2, color: '#fbbf24', model: null, specimen: 'protein', locked: true },
      ],
      decor: [
        { model: POLY.plant, pos: at(0, 0, -9.5, -7), height: 2.0 },
        { model: POLY.plant, pos: at(0, 0, 9.5, -7), height: 2.0 },
        { model: POLY.stool, pos: at(0, 0, -6, 4.5), height: 1.0 },
        { model: POLY.stool, pos: at(0, 0, 6, 4.5), height: 1.0 },
      ],
    },
  },
  {
    id: 'helix',
    phaseId: 'p2-helix',
    title: 'The Helix Vault',
    center: [0, -32],
    size: [26, 20],
    floorY: 0,
    accent: '#a78bfa',
    placard: {
      heading: 'OBJECTIVE · Survey the Double Helix',
      body: 'DNA is a twisted ladder of four bases: Adenine, Thymine, Cytosine, Guanine. Collect all four sample vials to unlock the stairs up.',
    },
    props: {
      helixCenterpiece: { pos: at(0, -32, 0, 0), height: 5.4, radius: 1.4 },
      vials: [
        { base: 'A', pos: at(0, -32, -8, -6) },
        { base: 'T', pos: at(0, -32, 8, -6) },
        { base: 'C', pos: at(0, -32, -8, 6) },
        { base: 'G', pos: at(0, -32, 8, 6) },
      ],
      decor: [
        { model: POLY.desk, pos: at(0, -32, -11, -6.5), height: 1.1, rotationY: Math.PI / 2, collide: 1.4 },
        { model: POLY.beaker, pos: at(0, -32, -10.7, -6.9), height: 0.55, lift: 1.1 },
        { model: POLY.flask, pos: at(0, -32, -10.7, -6.0), height: 0.6, lift: 1.1 },
        { model: POLY.plant, pos: at(0, -32, -11.5, 8), height: 2.0 },
        { model: POLY.plant, pos: at(0, -32, -11.5, -8.5), height: 2.0 },
        { model: POLY.stool, pos: at(0, -32, -8.5, -6.5), height: 1.0 },
      ],
    },
  },
  {
    id: 'pairing',
    phaseId: 'p3-pairing',
    title: 'Base-Pairing Lab',
    center: [34, -32],
    size: [24, 20],
    floorY: 3.2,
    accent: '#22d3ee',
    placard: {
      heading: 'BUILD TASK · Base Pairing',
      body: 'Every base has exactly one partner: A–T and C–G. Aim at the floating bases and press E to snap each open rung shut, then head north.',
    },
    props: {
      assembly: { mode: 'dna', pos: at(34, -32, 3, 0), facing: [1, 0] },
      decor: [
        { model: POLY.equipment, pos: at(34, -32, -8, 3), height: 1.5, rotationY: Math.PI / 2, collide: 1.5 },
        { model: POLY.plant, pos: at(34, -32, 10, 8), height: 2.0 },
        { model: POLY.plant, pos: at(34, -32, 10, -8), height: 2.0 },
      ],
    },
  },
  {
    id: 'transcription',
    phaseId: 'p4-transcription',
    title: 'Transcription Bay',
    center: [34, -64],
    size: [24, 20],
    floorY: 3.2,
    accent: '#fbbf24',
    placard: {
      heading: 'BUILD TASK · Transcription',
      body: 'RNA polymerase reads the template strand into mRNA — and RNA swaps Thymine for Uracil, so A now pairs with U. Feed the enzyme the right base at every rung.',
    },
    props: {
      assembly: { mode: 'transcription', pos: at(34, -64, 0, -3), facing: [0, -1] },
      decor: [
        { model: POLY.desk, pos: at(34, -64, 10, 0), height: 1.1, rotationY: -Math.PI / 2, collide: 1.4 },
        { model: POLY.monitor, pos: at(34, -64, 10, 0.4), height: 0.7, lift: 1.1, rotationY: -Math.PI / 2 },
        { model: POLY.beaker, pos: at(34, -64, 10, -0.6), height: 0.55, lift: 1.1 },
        { model: POLY.plant, pos: at(34, -64, 10, 8.5), height: 2.0 },
      ],
    },
  },
  {
    id: 'export',
    phaseId: 'p5-export',
    title: 'Export Atrium',
    center: [0, -64],
    size: [30, 24],
    floorY: 0,
    accent: '#5eead4',
    placard: {
      heading: 'DEBRIEF · The Message Leaves',
      body: 'The finished mRNA slips out of the nucleus toward the ribosomes to build a protein. You just switched a gene on. Step into the export portal to finish.',
    },
    props: {
      portal: { pos: at(0, -64, 0, -9) },
      decor: [
        { model: POLY.plant, pos: at(0, -64, -6, -6), height: 2.2 },
        { model: POLY.plant, pos: at(0, -64, 6, -6), height: 2.2 },
        { model: POLY.plant, pos: at(0, -64, -13, 6), height: 2.0 },
        { model: POLY.plant, pos: at(0, -64, 13, 6), height: 2.0 },
        { model: POLY.stool, pos: at(0, -64, -4, 8), height: 1.0 },
        { model: POLY.stool, pos: at(0, -64, 4, 8), height: 1.0 },
      ],
    },
  },
];

// Built collision + render geometry for the whole facility (computed once).
export const GEO = buildWorld(ROOMS);

// Circular colliders the player is pushed out of — specimens, benches, and big
// equipment. The active DNA capsule (the one you inspect) is intentionally NOT
// a collider, and it sits on the doorway axis, so it never blocks the exit.
export const COLLIDERS = ROOMS.flatMap((room) => {
  const y = room.floorY;
  const p = room.props;
  const out = [];
  p.capsules?.forEach((c) => {
    if (!c.active) out.push({ x: c.pos[0], z: c.pos[1], r: c.radius + 0.5, floorY: y });
  });
  if (p.helixCenterpiece) out.push({ x: p.helixCenterpiece.pos[0], z: p.helixCenterpiece.pos[1], r: p.helixCenterpiece.radius + 0.6, floorY: y });
  // The build helix dais blocks the player; candidate pedestals sit in front of it.
  if (p.assembly) out.push({ x: p.assembly.pos[0], z: p.assembly.pos[1], r: 2.3, floorY: y });
  p.decor?.forEach((d) => {
    if (d.collide) out.push({ x: d.pos[0], z: d.pos[1], r: d.collide, floorY: y });
  });
  return out;
});

// Convenience lookups keyed by phaseId, used by the renderer/interaction code.
export const ROOM_BY_PHASE = Object.fromEntries(ROOMS.map((r, i) => [r.phaseId, { ...r, index: i }]));
export const roomForPhase = (phaseId) => ROOM_BY_PHASE[phaseId];

// How close the player must be to "collect" a vial.
export const DISCOVER_RANGE = 2.8;
