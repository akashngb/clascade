import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Grid, useGLTF } from '@react-three/drei';
import { Capsule } from './Capsule.jsx';
import { ModelSpecimen } from './ModelSpecimen.jsx';
import { PlaceholderSpecimen } from './PlaceholderSpecimen.jsx';
import { SampleVial } from './SampleVial.jsx';
import { AssemblyStation } from './AssemblyStation.jsx';
import { DnaHelix } from './DnaHelix.jsx';
import { Door } from './Door.jsx';
import { Staircase } from './Staircase.jsx';
import { InfoPlacard } from './InfoPlacard.jsx';
import { PolyProp } from './PolyProp.jsx';
import { Nearby } from './Nearby.jsx';
import { BlobShadow } from './BlobShadow.jsx';
import { ROOMS, GEO, VIEW } from '../worldConfig.js';
import { ROOM_H, CORRIDOR_H, WALL_T } from '../worldGeometry.js';

// Cull radius for a shape that extends `halfExtent` from its centre: once its
// nearest point is past the fog end, it contributes nothing but draw calls.
const cullRadius = (halfExtent) => VIEW.fogEnd + halfExtent;
const halfDiag = (w, d) => Math.hypot(w, d) / 2;

const WHITE = '#eef2f7';
const FRAME = '#cad4df';
const ACCENT = '#22d3ee';

// White nudged toward a room's accent — mood per room without extra lights.
const tintToward = (accent, amount = 0.18) =>
  `#${new THREE.Color('#ffffff').lerp(new THREE.Color(accent), amount).getHexString()}`;

// Preload GLB-backed specimens and every Poly Pizza decor model.
ROOMS.forEach((r) => {
  r.props.capsules?.forEach((c) => c.model && useGLTF.preload(c.model));
  r.props.decor?.forEach((d) => useGLTF.preload(d.model));
});

// --- one straight wall box between two XZ points --------------------------
function WallSeg({ seg }) {
  const { ax, az, bx, bz, floorY, height } = seg;
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return null;
  const cx = (ax + bx) / 2;
  const cz = (az + bz) / 2;
  const rotY = -Math.atan2(dz, dx);
  return (
    <group position={[cx, floorY, cz]} rotation={[0, rotY, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[len, height, WALL_T]} />
        <meshStandardMaterial color={WHITE} metalness={0.15} roughness={0.6} />
      </mesh>
      {/* glowing accent seam */}
      <mesh position={[0, 1.15, WALL_T / 2 + 0.005]}>
        <planeGeometry args={[len, 0.04]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 1.15, -WALL_T / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[len, 0.04]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.7} />
      </mesh>
      {/* baseboard */}
      <mesh position={[0, 0.25, WALL_T / 2 + 0.005]}>
        <planeGeometry args={[len, 0.5]} />
        <meshStandardMaterial color={FRAME} metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

// --- floor + ceiling + platform + grid for one room -----------------------
function RoomShell({ room }) {
  const [cx, cz] = room.center;
  const [w, d] = room.size;
  const y = room.floorY;
  const lightColor = useMemo(() => tintToward(room.accent), [room.accent]);
  return (
    <group>
      {/* raised platform plinth so upper rooms look supported */}
      {y > 0.01 && (
        <mesh position={[cx, y / 2, cz]}>
          <boxGeometry args={[w, y, d]} />
          <meshStandardMaterial color="#dbe3ec" metalness={0.2} roughness={0.6} />
        </mesh>
      )}
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, y + 0.01, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#e6ecf3" metalness={0.2} roughness={0.5} />
      </mesh>
      <Grid
        position={[cx, y + 0.02, cz]}
        args={[w, d]}
        cellSize={1.5}
        cellThickness={0.6}
        cellColor="#c2cedb"
        sectionSize={4.5}
        sectionThickness={1}
        sectionColor="#8fa6bd"
        fadeDistance={40}
        fadeStrength={1.2}
        infiniteGrid={false}
      />
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[cx, y + ROOM_H, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f3f7fb" metalness={0.1} roughness={0.7} />
      </mesh>
      {/* ceiling light strip */}
      <mesh position={[cx, y + ROOM_H - 0.03, cz]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, d * 0.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      {/* Lights cull tighter than geometry: every live light taxes every lit
          fragment on screen, so only rooms near the player keep theirs. */}
      <Nearby center={[cx, cz]} radius={Math.max(w, d) * 1.6 + 10}>
        <pointLight position={[cx, y + ROOM_H - 0.5, cz]} intensity={22} color={lightColor} distance={Math.max(w, d) * 1.6} />
      </Nearby>
    </group>
  );
}

// --- corridor floor / walls / ceiling -------------------------------------
function CorridorShell({ c }) {
  const along = c.axis === 'z' ? 'z' : 'x';
  const topFloor = Math.max(c.rampFrom.y, c.rampTo.y);
  const midX = (c.minX + c.maxX) / 2;
  const midZ = (c.minZ + c.maxZ) / 2;
  // Passage between the two room edges (region minus the overlap into rooms).
  const aEdge = c.rampFrom.at;
  const bEdge = c.rampTo.at;
  const lo = Math.min(aEdge, bEdge);
  const hi = Math.max(aEdge, bEdge);

  const wallSegs = [];
  if (along === 'z') {
    wallSegs.push({ ax: c.minX, az: lo, bx: c.minX, bz: hi, floorY: 0, height: topFloor + CORRIDOR_H });
    wallSegs.push({ ax: c.maxX, az: lo, bx: c.maxX, bz: hi, floorY: 0, height: topFloor + CORRIDOR_H });
  } else {
    wallSegs.push({ ax: lo, az: c.minZ, bx: hi, bz: c.minZ, floorY: 0, height: topFloor + CORRIDOR_H });
    wallSegs.push({ ax: lo, az: c.maxZ, bx: hi, bz: c.maxZ, floorY: 0, height: topFloor + CORRIDOR_H });
  }

  return (
    <group>
      {c.ramp ? (
        <Staircase corridor={c} />
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[midX, topFloor + 0.01, midZ]}>
          <planeGeometry args={[c.maxX - c.minX, c.maxZ - c.minZ]} />
          <meshStandardMaterial color="#e6ecf3" metalness={0.2} roughness={0.5} />
        </mesh>
      )}
      {wallSegs.map((seg, i) => (
        <WallSeg key={i} seg={seg} />
      ))}
      {/* ceiling over the passage */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[midX, topFloor + CORRIDOR_H, midZ]}>
        <planeGeometry args={[c.maxX - c.minX, c.maxZ - c.minZ]} />
        <meshStandardMaterial color="#eef3f9" metalness={0.1} roughness={0.7} side={2} />
      </mesh>
      <Nearby center={[midX, midZ]} radius={30}>
        <pointLight position={[midX, topFloor + CORRIDOR_H - 0.4, midZ]} intensity={10} color="#ffffff" distance={12} />
      </Nearby>
    </group>
  );
}

// Where each room's slide placard is mounted (a clear wall, facing inward).
const PLACARD_POSE = {
  arrival: { pos: [-10.7, 2.2, 0], rotY: Math.PI / 2 },
  helix: { pos: [-12.7, 2.2, -32], rotY: Math.PI / 2 },
  pairing: { pos: [34, 5.4, -22.3], rotY: Math.PI },
  transcription: { pos: [45.7, 5.4, -64], rotY: -Math.PI / 2 },
  export: { pos: [0, 2.2, -75.7], rotY: 0 },
};

function Specimen({ capsule }) {
  if (capsule.model) {
    return <ModelSpecimen url={capsule.model} targetHeight={capsule.height * 0.62} emissive={capsule.color} />;
  }
  return <PlaceholderSpecimen kind={capsule.specimen} color={capsule.color} />;
}

// Everything inside one room: its slide placard + interactive props.
function RoomContents({ room, isActive, foundBases, assembly }) {
  const y = room.floorY;
  const p = room.props;
  const pose = PLACARD_POSE[room.id];
  return (
    <group>
      {pose && (
        <InfoPlacard position={pose.pos} rotation={[0, pose.rotY, 0]} accent={room.accent} placard={room.placard} />
      )}

      {p.capsules?.map((c) => (
        <Capsule
          key={c.id}
          position={[c.pos[0], y, c.pos[1]]}
          radius={c.radius}
          height={c.height}
          color={c.color}
          label={c.label}
          sub={c.sub}
          active={c.active}
          locked={c.locked}
        >
          <Specimen capsule={c} />
        </Capsule>
      ))}

      {p.helixCenterpiece && (
        <group position={[p.helixCenterpiece.pos[0], y, p.helixCenterpiece.pos[1]]}>
          <BlobShadow radius={p.helixCenterpiece.radius + 1.1} />
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[p.helixCenterpiece.radius + 0.4, p.helixCenterpiece.radius + 0.6, 0.4, 24]} />
            <meshStandardMaterial color="#0c1422" metalness={0.7} roughness={0.35} emissive={room.accent} emissiveIntensity={0.2} />
          </mesh>
          <group position={[0, p.helixCenterpiece.height / 2 + 0.4, 0]}>
            <DnaHelix mode="display" radius={p.helixCenterpiece.radius} height={p.helixCenterpiece.height} turns={2.2} spin={0.18} />
          </group>
          <Nearby center={p.helixCenterpiece.pos} radius={28}>
            <pointLight position={[0, p.helixCenterpiece.height / 2, 0]} intensity={8} color={room.accent} distance={8} />
          </Nearby>
        </group>
      )}

      {p.vials?.map((v) => (
        <group key={v.base} position={[0, y, 0]}>
          <SampleVial base={v.base} position={[v.pos[0], 0, v.pos[1]]} found={foundBases.includes(v.base)} />
        </group>
      ))}

      {/* The hands-on build station, live only in the room you're currently in. */}
      {p.assembly && isActive && (
        <AssemblyStation
          origin={[p.assembly.pos[0], y, p.assembly.pos[1]]}
          facing={p.assembly.facing}
          mode={p.assembly.mode}
          pairIndex={assembly.pairIndex}
          onPair={assembly.onPair}
        />
      )}

      {p.portal && <Portal position={[p.portal.pos[0], y, p.portal.pos[1]]} active={isActive} />}

      {p.decor?.map((d, i) => (
        <group key={`d${i}`} position={[d.pos[0], y + (d.lift ?? 0), d.pos[1]]}>
          <PolyProp url={d.model} height={d.height} rotationY={d.rotationY ?? 0} />
        </group>
      ))}
    </group>
  );
}

// The exit portal in the final room — walk into it to finish the lesson.
// The core breathes and two sparks orbit the ring so it reads as a live
// destination from across the atrium, not a static prop.
function Portal({ position, active }) {
  const core = useRef();
  const sparkA = useRef();
  const sparkB = useRef();
  const light = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const base = active ? 0.22 : 0.1;
    if (core.current) core.current.material.opacity = base + Math.sin(t * 2.1) * 0.05;
    if (light.current) light.current.intensity = (active ? 10 : 3) + Math.sin(t * 2.1) * (active ? 2 : 0.6);
    const a = t * (active ? 1.6 : 0.7);
    if (sparkA.current) sparkA.current.position.set(Math.cos(a) * 1.8, 2.1 + Math.sin(a) * 1.8, 0);
    if (sparkB.current) sparkB.current.position.set(Math.cos(a + Math.PI) * 1.8, 2.1 + Math.sin(a + Math.PI) * 1.8, 0);
  });

  return (
    <group position={position}>
      <mesh position={[0, 2.1, 0]}>
        <torusGeometry args={[1.8, 0.14, 12, 32]} />
        <meshStandardMaterial color="#0e1728" emissive="#5eead4" emissiveIntensity={active ? 1 : 0.4} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh ref={core} position={[0, 2.1, 0]}>
        <circleGeometry args={[1.7, 32]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={active ? 0.22 : 0.1} side={2} />
      </mesh>
      {[sparkA, sparkB].map((ref, i) => (
        <mesh key={i} ref={ref}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#b9fff0" />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, 2.1, 0]} intensity={active ? 10 : 3} color="#5eead4" distance={8} />
    </group>
  );
}

// The whole facility: shells for every room + corridor, all walls, doors,
// and each room's slide contents.
export function Lab({ foundBases, activePhaseId, assembly, doorsOpen }) {
  return (
    <group>
      {ROOMS.map((room) => (
        <Nearby key={room.id} center={room.center} radius={cullRadius(halfDiag(...room.size))}>
          <RoomShell room={room} />
        </Nearby>
      ))}
      {GEO.corridors.map((c) => (
        <Nearby
          key={c.id}
          center={[(c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2]}
          radius={cullRadius(halfDiag(c.maxX - c.minX, c.maxZ - c.minZ))}
        >
          <CorridorShell c={c} />
        </Nearby>
      ))}
      {GEO.wallSegments.map((seg, i) => (
        <Nearby
          key={`w${i}`}
          center={[(seg.ax + seg.bx) / 2, (seg.az + seg.bz) / 2]}
          radius={cullRadius(Math.hypot(seg.bx - seg.ax, seg.bz - seg.az) / 2)}
        >
          <WallSeg seg={seg} />
        </Nearby>
      ))}
      {GEO.doors.map((door) => (
        <Nearby key={door.index} center={[door.pos[0], door.pos[2]]} radius={cullRadius(door.width)}>
          <Door door={door} open={doorsOpen[door.index]} />
        </Nearby>
      ))}
      {ROOMS.map((room) => (
        <Nearby key={`c-${room.id}`} center={room.center} radius={cullRadius(halfDiag(...room.size))}>
          <RoomContents
            room={room}
            isActive={room.phaseId === activePhaseId}
            foundBases={foundBases}
            assembly={assembly}
          />
        </Nearby>
      ))}
    </group>
  );
}

export default Lab;
