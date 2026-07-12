// ---------------------------------------------------------------------------
// WORLD GEOMETRY — turns a compact list of ROOMS into the physical facility.
//
// The lesson is a chain of rooms (one per slide/phase). Consecutive rooms are
// joined by a CORRIDOR, and each corridor holds a DOOR that stays locked until
// the source room's objective is cleared. Some corridors change floor height —
// those are ramps rendered as staircases.
//
// This module is pure math. It produces:
//   - regions:      walkable rectangles (rooms + corridors) with floor height
//   - corridors:    joins between rooms, flagged as ramp/flat, with a door
//   - doors:        gate metadata (which phase unlocks it, where it sits)
//   - wallSegments: room perimeter walls with doorway gaps punched out
//
// Player.jsx queries floorAt()/isWalkable()/roomIndexAt() every frame; Lab.jsx
// renders regions + wallSegments + doors. Both read the SAME geometry so the
// visible building and the collision volume can never disagree.
// ---------------------------------------------------------------------------

export const CORRIDOR_W = 5; // width of the passage between two rooms (metres)
export const OVERLAP = 1.6; // how far a corridor reaches into each room it joins
export const ROOM_H = 6.2; // interior ceiling height of a room
export const CORRIDOR_H = 3.8; // lower ceiling in passages, for a "doorway" feel
export const WALL_T = 0.34; // wall thickness
export const DOOR_H = 3.4; // clear height of a doorway

const rectOf = (room) => {
  const [cx, cz] = room.center;
  const [w, d] = room.size;
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
};

const inside = (r, x, z, m = 0) =>
  x >= r.minX + m && x <= r.maxX - m && z >= r.minZ + m && z <= r.maxZ - m;

// Build the full facility from the room chain. Consecutive room centres MUST be
// axis-aligned (share an x or a z) so the corridor between them is straight.
export function buildWorld(rooms) {
  const regions = rooms.map((room, i) => ({
    id: room.id,
    kind: 'room',
    index: i,
    floorY: room.floorY,
    room,
    ...rectOf(room),
  }));

  const openings = rooms.map(() => []); // per-room doorway gaps to punch in walls
  const corridors = [];
  const doors = [];

  for (let i = 0; i < rooms.length - 1; i += 1) {
    const a = rooms[i];
    const b = rooms[i + 1];
    const ra = rectOf(a);
    const rb = rectOf(b);
    const shareX = Math.abs(a.center[0] - b.center[0]) < 1e-6;

    let region;
    let door;

    if (shareX) {
      // Corridor runs along Z between the two rooms.
      const x = a.center[0];
      const aFacesMinZ = b.center[1] < a.center[1]; // b sits at more negative z
      const aEdge = aFacesMinZ ? ra.minZ : ra.maxZ; // wall of a facing b
      const bEdge = aFacesMinZ ? rb.maxZ : rb.minZ; // wall of b facing a
      const zLo = Math.min(aEdge, bEdge) - OVERLAP;
      const zHi = Math.max(aEdge, bEdge) + OVERLAP;
      region = {
        id: `c${i}`,
        kind: 'corridor',
        axis: 'z',
        index: i,
        minX: x - CORRIDOR_W / 2,
        maxX: x + CORRIDOR_W / 2,
        minZ: zLo,
        maxZ: zHi,
        // ramp height: floorFrom at a's edge -> floorTo at b's edge
        rampFrom: { at: aEdge, y: a.floorY },
        rampTo: { at: bEdge, y: b.floorY },
      };
      door = {
        index: i,
        fromRoom: a.id,
        toRoom: b.id,
        axis: 'z',
        pos: [x, a.floorY, aEdge], // door sits at a's exit
        width: CORRIDOR_W,
        floorY: a.floorY,
        cross: { axis: 'z', at: bEdge, enterSign: aFacesMinZ ? -1 : 1 },
      };
      openings[i].push({ side: aFacesMinZ ? 'zMin' : 'zMax', lo: x - CORRIDOR_W / 2, hi: x + CORRIDOR_W / 2 });
      openings[i + 1].push({ side: aFacesMinZ ? 'zMax' : 'zMin', lo: x - CORRIDOR_W / 2, hi: x + CORRIDOR_W / 2 });
    } else {
      // Corridor runs along X between the two rooms.
      const z = a.center[1];
      const aFacesMinX = b.center[0] < a.center[0];
      const aEdge = aFacesMinX ? ra.minX : ra.maxX;
      const bEdge = aFacesMinX ? rb.maxX : rb.minX;
      const xLo = Math.min(aEdge, bEdge) - OVERLAP;
      const xHi = Math.max(aEdge, bEdge) + OVERLAP;
      region = {
        id: `c${i}`,
        kind: 'corridor',
        axis: 'x',
        index: i,
        minX: xLo,
        maxX: xHi,
        minZ: z - CORRIDOR_W / 2,
        maxZ: z + CORRIDOR_W / 2,
        rampFrom: { at: aEdge, y: a.floorY },
        rampTo: { at: bEdge, y: b.floorY },
      };
      door = {
        index: i,
        fromRoom: a.id,
        toRoom: b.id,
        axis: 'x',
        pos: [aEdge, a.floorY, z],
        width: CORRIDOR_W,
        floorY: a.floorY,
        cross: { axis: 'x', at: bEdge, enterSign: aFacesMinX ? -1 : 1 },
      };
      openings[i].push({ side: aFacesMinX ? 'xMin' : 'xMax', lo: z - CORRIDOR_W / 2, hi: z + CORRIDOR_W / 2 });
      openings[i + 1].push({ side: aFacesMinX ? 'xMax' : 'xMin', lo: z - CORRIDOR_W / 2, hi: z + CORRIDOR_W / 2 });
    }

    region.ramp = Math.abs(a.floorY - b.floorY) > 1e-6;
    regions.push(region);
    corridors.push(region);
    doors.push(door);
  }

  const wallSegments = rooms.flatMap((room, i) => roomWalls(room, openings[i]));

  const bounds = regions.reduce(
    (acc, r) => ({
      minX: Math.min(acc.minX, r.minX),
      maxX: Math.max(acc.maxX, r.maxX),
      minZ: Math.min(acc.minZ, r.minZ),
      maxZ: Math.max(acc.maxZ, r.maxZ),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  );

  return { rooms, regions, corridors, doors, wallSegments, bounds };
}

// Split a room's four walls into segments, punching a gap where a corridor
// attaches. Assumes at most one opening per side (true for a linear chain).
function roomWalls(room, openings) {
  const r = rectOf(room);
  const y = room.floorY;
  const segs = [];
  const bySide = (side) => openings.find((o) => o.side === side);

  const along = (side, fixedA, fixedB, lo, hi, orient) => {
    const gap = bySide(side);
    const spans = gap ? [[lo, gap.lo], [gap.hi, hi]] : [[lo, hi]];
    for (const [s, e] of spans) {
      if (e - s < 0.05) continue;
      segs.push(
        orient === 'x'
          ? { ax: s, az: fixedA, bx: e, bz: fixedA, floorY: y, height: ROOM_H }
          : { ax: fixedA, az: s, bx: fixedA, bz: e, floorY: y, height: ROOM_H }
      );
    }
  };

  along('zMin', r.minZ, null, r.minX, r.maxX, 'x');
  along('zMax', r.maxZ, null, r.minX, r.maxX, 'x');
  along('xMin', r.minX, null, r.minZ, r.maxZ, 'z');
  along('xMax', r.maxX, null, r.minZ, r.maxZ, 'z');
  return segs;
}

// Floor height under a point, or null if the point is outside every region.
export function floorAt(x, z, geo, margin = 0) {
  // Rooms take priority (their floor is authoritative where corridors overlap).
  for (const r of geo.regions) {
    if (r.kind === 'room' && inside(r, x, z, margin)) return r.floorY;
  }
  for (const r of geo.regions) {
    if (r.kind !== 'corridor') continue;
    if (!inside(r, x, z, margin)) continue;
    if (!r.ramp) return r.rampFrom.y;
    const coord = r.axis === 'z' ? z : x;
    const { rampFrom: f, rampTo: t } = r;
    const span = t.at - f.at;
    const s = Math.abs(span) < 1e-6 ? 0 : (coord - f.at) / span;
    const clamped = Math.max(0, Math.min(1, s));
    return f.y + (t.y - f.y) * clamped;
  }
  return null;
}

export const isWalkable = (x, z, geo, margin) => floorAt(x, z, geo, margin) !== null;

// Which room rectangle contains the point, or -1 if in a corridor / outside.
export function roomIndexAt(x, z, geo) {
  for (const r of geo.regions) {
    if (r.kind === 'room' && inside(r, x, z)) return r.index;
  }
  return -1;
}

export default buildWorld;
