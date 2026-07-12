import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { BlobShadow } from './BlobShadow.jsx';

// Loads a low-poly GLB (sourced from Poly Pizza, CC-BY / CC0 — see
// public/assets/models/polypizza/attributions.json) and stands it ON the floor:
// recentred on X/Z and dropped so its base sits at y=0, then scaled to a target
// height. Used to dress the rooms with real lab furniture and equipment.
export function PolyProp({ url, height = 1.5, rotationY = 0, emissive }) {
  const { scene } = useGLTF(url);

  const { object, scale, offset, footprint } = useMemo(() => {
    const obj = scene.clone(true);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = height / (size.y || 1);
    if (emissive) {
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          const mat = child.material.clone();
          mat.emissive = new THREE.Color(emissive);
          mat.emissiveIntensity = 0.15;
          child.material = mat;
        }
      });
    }
    // Offset (in model units) that centres X/Z and puts the base at y=0.
    return {
      object: obj,
      scale: s,
      offset: [-center.x, -box.min.y, -center.z],
      footprint: (Math.max(size.x, size.z) * s) / 2, // world-unit ground radius
    };
  }, [scene, height, emissive]);

  return (
    <group rotation={[0, rotationY, 0]}>
      <BlobShadow radius={footprint * 1.2} />
      <group scale={scale}>
        <primitive object={object} position={offset} />
      </group>
    </group>
  );
}

export default PolyProp;
