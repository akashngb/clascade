import { useMemo } from 'react';
import { bondTransform } from './geometry.js';

// A single cylinder drawn between two Vector3 points (backbone segment or rung).
export function Bond({ from, to, radius = 0.05, color = '#3b82f6', emissive, emissiveIntensity = 0.4, opacity = 1 }) {
  const { position, quaternion, length } = useMemo(() => bondTransform(from, to), [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.35}
        metalness={0.1}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

export default Bond;
