import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DOOR_H, CORRIDOR_W } from '../worldGeometry.js';

// A gate across a corridor. Locked until the room's objective is cleared, then
// it slides up into the frame and turns green. This is the "clear a room to
// continue" mechanic made physical: while locked the panel is also a collider
// (Player.jsx blocks the doorway), so the student cannot walk ahead.
export function Door({ door, open }) {
  const panel = useRef();
  const y = useRef(0);
  const [x, floorY, z] = door.pos;
  const rotY = door.axis === 'x' ? Math.PI / 2 : 0; // face across the corridor
  const color = open ? '#4ade80' : '#f87171';
  const w = CORRIDOR_W - 0.2;

  useFrame((_, delta) => {
    if (!panel.current) return;
    const target = open ? DOOR_H - 0.05 : 0; // slide up when open
    y.current += (target - y.current) * Math.min(1, delta * 5);
    panel.current.position.y = floorY + DOOR_H / 2 + y.current;
    const m = panel.current.children[0]?.material;
    if (m) m.emissiveIntensity = open ? 0.5 : 0.85 + Math.sin(performance.now() / 260) * 0.15;
  });

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* frame posts + lintel */}
      {[-w / 2 - 0.15, w / 2 + 0.15].map((px) => (
        <mesh key={px} position={[px, floorY + DOOR_H / 2, 0]}>
          <boxGeometry args={[0.3, DOOR_H, 0.6]} />
          <meshStandardMaterial color="#0e1728" metalness={0.6} roughness={0.4} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      ))}
      <mesh position={[0, floorY + DOOR_H + 0.15, 0]}>
        <boxGeometry args={[w + 0.6, 0.3, 0.6]} />
        <meshStandardMaterial color="#0e1728" metalness={0.6} roughness={0.4} emissive={color} emissiveIntensity={0.35} />
      </mesh>

      {/* sliding panel */}
      <group ref={panel} position={[0, floorY + DOOR_H / 2, 0]}>
        <mesh>
          <boxGeometry args={[w, DOOR_H, 0.18]} />
          <meshStandardMaterial color={open ? '#0f2a1a' : '#2a0f12'} metalness={0.5} roughness={0.4} emissive={color} emissiveIntensity={0.8} />
        </mesh>
        {/* status seam */}
        <mesh position={[0, 0, 0.11]}>
          <planeGeometry args={[w * 0.9, 0.06]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      {!open && (
        <Html position={[0, floorY + DOOR_H + 0.7, 0]} center distanceFactor={16} occlude>
          <div className="sq-doorlabel locked">🔒 LOCKED · clear this room</div>
        </Html>
      )}
      {open && (
        <Html position={[0, floorY + DOOR_H + 0.7, 0]} center distanceFactor={16} occlude>
          <div className="sq-doorlabel open">✓ OPEN · walk through →</div>
        </Html>
      )}
      <pointLight position={[0, floorY + 1.4, 0]} intensity={4} color={color} distance={6} />
    </group>
  );
}

export default Door;
