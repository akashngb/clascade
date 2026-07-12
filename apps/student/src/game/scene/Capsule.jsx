import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BlobShadow } from './BlobShadow.jsx';

// A large glass containment capsule holding a floating biology specimen.
// Reused for every sample in the lab. `children` is the specimen to display.
export function Capsule({ position, radius = 1.6, height = 5, color = '#5eead4', label, sub, active = false, locked = false, children }) {
  const glow = useRef();
  const holder = useRef();
  const cy = height / 2;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (glow.current) {
      const base = active ? 0.5 : 0.22;
      glow.current.material.opacity = base + Math.sin(t * 1.6) * 0.06;
    }
    // Specimen floats gently; phase offset by position so capsules desync.
    if (holder.current) holder.current.position.y = cy + Math.sin(t * 0.9 + position[0]) * 0.08;
  });

  return (
    <group position={position}>
      <BlobShadow radius={radius + 0.9} />
      {/* base plinth */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[radius + 0.35, radius + 0.55, 0.36, 24]} />
        <meshStandardMaterial color="#0c1422" metalness={0.7} roughness={0.35} emissive={color} emissiveIntensity={active ? 0.3 : 0.08} />
      </mesh>
      {/* metal rings top & bottom */}
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.06, 10, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1 : 0.4} />
      </mesh>
      <mesh position={[0, height - 0.1, 0]}>
        <cylinderGeometry args={[radius + 0.2, radius + 0.2, 0.4, 24]} />
        <meshStandardMaterial color="#0c1422" metalness={0.7} roughness={0.35} emissive={color} emissiveIntensity={active ? 0.4 : 0.1} />
      </mesh>

      {/* inner volumetric glow (front faces only — halves the overdraw) */}
      <mesh ref={glow} position={[0, cy, 0]}>
        <cylinderGeometry args={[radius - 0.15, radius - 0.15, height - 0.6, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* the specimen */}
      <group ref={holder} position={[0, cy, 0]}>{children}</group>

      {/* glass shell (drawn last, transparent) */}
      <mesh position={[0, cy, 0]}>
        <cylinderGeometry args={[radius, radius, height - 0.5, 28, 1, true]} />
        <meshStandardMaterial color="#bfe9ff" transparent opacity={0.08} roughness={0.05} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* light inside to lift the specimen */}
      <pointLight position={[0, cy, 0]} intensity={active ? 14 : 6} color={color} distance={height * 1.4} />

      {/* holographic label */}
      <Html position={[0, height + 0.7, 0]} center distanceFactor={16} occlude>
        <div className={`sq-capsule-label ${locked ? 'locked' : ''} ${active ? 'active' : ''}`}>
          <span style={{ color }}>{label}</span>
          <small>{locked ? '🔒 ' + sub : sub}</small>
        </div>
      </Html>
    </group>
  );
}

export default Capsule;
