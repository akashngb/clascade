import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BASES } from '../../lessons/dnaTranscription.js';
import { BlobShadow } from './BlobShadow.jsx';

// A small specimen vial on a lab bench holding one nucleotide base sample. The
// student walks up to it to "collect" it during the explore objective.
export function SampleVial({ base, position, found }) {
  const bead = useRef();
  const info = BASES[base];
  useFrame((state) => {
    if (bead.current) {
      bead.current.position.y = 1.35 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.06;
      bead.current.rotation.y = state.clock.elapsedTime * 0.8;
    }
  });
  return (
    <group position={position}>
      <BlobShadow radius={0.85} />
      {/* bench pedestal */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial color="#0e1728" metalness={0.5} roughness={0.5} emissive={info.color} emissiveIntensity={found ? 0.35 : 0.08} />
      </mesh>
      {/* glass vial */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.9, 12, 1, true]} />
        <meshStandardMaterial color="#bfe9ff" transparent opacity={0.14} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.1, 12]} />
        <meshStandardMaterial color={info.color} emissive={info.color} emissiveIntensity={found ? 1 : 0.4} />
      </mesh>
      {/* floating base sample */}
      <mesh ref={bead}>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial color={info.color} emissive={info.color} emissiveIntensity={found ? 1.3 : 0.7} roughness={0.2} flatShading />
      </mesh>
      <Html position={[0, 2.2, 0]} center distanceFactor={11} occlude>
        <div className={`sq-worldlabel ${found ? 'found' : ''}`}>
          <span style={{ color: info.color }}>{found ? base : '?'}</span>
          <small>{found ? info.name : 'sample me'}</small>
        </div>
      </Html>
    </group>
  );
}

export default SampleVial;
