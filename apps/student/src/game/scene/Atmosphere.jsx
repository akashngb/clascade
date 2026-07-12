import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ROOMS } from '../worldConfig.js';
import { ROOM_H } from '../worldGeometry.js';

// One additive points cloud of dust motes spanning the whole facility. A single
// draw call buys a lot of depth cue: near motes drift past the camera while far
// ones dissolve into the fog. The point positions are static; the group sways
// slowly instead, so the air feels alive with zero per-point CPU work.
const MOTE_COUNT = 600;
const MOTE_COLOR = '#7dd3e8';

function facilityBounds() {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, maxY: 0 };
  ROOMS.forEach((room) => {
    const [cx, cz] = room.center;
    const [w, d] = room.size;
    b.minX = Math.min(b.minX, cx - w / 2);
    b.maxX = Math.max(b.maxX, cx + w / 2);
    b.minZ = Math.min(b.minZ, cz - d / 2);
    b.maxZ = Math.max(b.maxZ, cz + d / 2);
    b.maxY = Math.max(b.maxY, room.floorY + ROOM_H);
  });
  return b;
}

export function Atmosphere() {
  const group = useRef();
  const positions = useMemo(() => {
    const b = facilityBounds();
    const arr = new Float32Array(MOTE_COUNT * 3);
    for (let i = 0; i < MOTE_COUNT; i += 1) {
      arr[i * 3] = b.minX + Math.random() * (b.maxX - b.minX);
      arr[i * 3 + 1] = 0.3 + Math.random() * (b.maxY - 0.6);
      arr[i * 3 + 2] = b.minZ + Math.random() * (b.maxZ - b.minZ);
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.07) * 0.5;
    group.current.position.x = Math.sin(t * 0.045) * 0.6;
  });

  return (
    <points ref={group}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MOTE_COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        color={MOTE_COLOR}
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default Atmosphere;
