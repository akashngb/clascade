import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BASES } from '../../lessons/dnaTranscription.js';

// A single base "bead" on the helix. Optionally clickable (explore mode) and
// optionally pulsing (the active rung the student is solving).
export function Nucleotide({ base, position, radius = 0.28, pulse = false, clickable = false, onClick }) {
  const ref = useRef();
  const info = BASES[base] ?? { color: '#94a3b8' };

  useFrame((state) => {
    if (!ref.current) return;
    const s = pulse ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.14 : 1;
    ref.current.scale.setScalar(s);
  });

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={
        clickable
          ? (e) => {
              e.stopPropagation();
              onClick?.(base);
            }
          : undefined
      }
      onPointerOver={clickable ? () => (document.body.style.cursor = 'pointer') : undefined}
      onPointerOut={clickable ? () => (document.body.style.cursor = 'auto') : undefined}
    >
      <sphereGeometry args={[radius, 12, 12]} />
      <meshStandardMaterial
        color={info.color}
        emissive={info.color}
        emissiveIntensity={pulse ? 1.1 : 0.5}
        roughness={0.25}
        metalness={0.15}
      />
    </mesh>
  );
}

export default Nucleotide;
