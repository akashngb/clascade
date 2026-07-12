import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Procedural stand-ins for the locked sample capsules (cell / protein / virus).
// Placeholders for now — drop real GLBs into /public/assets/models and swap.
export function PlaceholderSpecimen({ kind = 'cell', color = '#a78bfa' }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.2;
  });

  const blobs = useMemo(() => {
    const rng = (seed) => Math.sin(seed * 999.13) * 0.5 + 0.5;
    return Array.from({ length: 7 }, (_, i) => [
      (rng(i + 1) - 0.5) * 1.2,
      (rng(i + 4) - 0.5) * 1.2,
      (rng(i + 7) - 0.5) * 1.2,
    ]);
  }, []);

  return (
    <group ref={ref}>
      {kind === 'cell' && (
        <>
          <mesh>
            <sphereGeometry args={[1.3, 32, 32]} />
            <meshStandardMaterial color={color} transparent opacity={0.18} roughness={0.4} emissive={color} emissiveIntensity={0.3} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.5, 24, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.3} />
          </mesh>
          {blobs.map((p, i) => (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
            </mesh>
          ))}
        </>
      )}

      {kind === 'protein' && (
        <>
          {Array.from({ length: 14 }, (_, i) => {
            const a = i * 0.9;
            const y = (i / 13 - 0.5) * 2.4;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.7, y, Math.sin(a) * 0.7]}>
                <icosahedronGeometry args={[0.28, 0]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} flatShading roughness={0.4} />
              </mesh>
            );
          })}
        </>
      )}

      {kind === 'virus' && (
        <>
          <mesh position={[0, 0.6, 0]}>
            <icosahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} flatShading roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 1.2, 10]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.35, -1, Math.sin(a) * 0.35]} rotation={[0.5, -a, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
}

export default PlaceholderSpecimen;
