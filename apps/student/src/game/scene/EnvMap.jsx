import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Generates a neutral studio environment map locally (no network fetch) and
// assigns it as scene.environment, so every metallic / rough material has
// something real to reflect. Without this, metalness renders flat grey.
export function EnvMap({ intensity = 0.5 }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = intensity;
    return () => {
      if (scene.environment === tex) scene.environment = null;
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}

export default EnvMap;
