import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// The enzyme that "unzips" the helix during transcription. Rendered inside the
// helix group so it rides along with rotation and clamps the active rung.
// Placeholder blob — swap for a sourced enzyme GLB from /public/assets/models.
export function RnaPolymerase({ position }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.6;
    ref.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#5eead4"
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.2}
          flatShading
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshBasicMaterial color="#5eead4" wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

export default RnaPolymerase;
