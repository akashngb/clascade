import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

// Loads any GLB and displays it as a floating specimen: recentered to its true
// world-space center, scaled to a target height, gently rotating in place.
// Used for the real DNA helix and any other capsule model that gets dropped in.
export function ModelSpecimen({ url, targetHeight = 3.6, emissive = '#5eead4', spin = 0.25 }) {
  const ref = useRef();
  const { scene } = useGLTF(url);

  const { object, scale, center } = useMemo(() => {
    const obj = scene.clone(true);
    // Sketchfab models nest transforms on a root node; world matrices must be
    // resolved before measuring or the box (and thus the center) is wrong,
    // which makes the model orbit the capsule axis instead of spinning in place.
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const c = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(c);
    const s = targetHeight / (size.y || 1);
    obj.traverse((child) => {
      if (child.isMesh && child.material) {
        const mat = child.material.clone();
        mat.emissive = new THREE.Color(emissive);
        mat.emissiveIntensity = 0.22;
        child.material = mat;
      }
    });
    return { object: obj, scale: s, center: c };
  }, [scene, targetHeight, emissive]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * spin;
  });

  return (
    <group ref={ref}>
      {/* Scale, then translate the model so its true centre sits at the origin. */}
      <group scale={scale}>
        <primitive object={object} position={[-center.x, -center.y, -center.z]} />
      </group>
    </group>
  );
}

export default ModelSpecimen;
