import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { playerState } from '../playerState.js';

const EXIT_PAD = 3; // hysteresis so visibility can't flap at the boundary

// Mounts children only while the player is within `radius` of `center` ([x, z]).
// Culls whole rooms / lights / labels that the fog has already swallowed.
// Unmounting (rather than toggling `visible`) also removes drei <Html> labels,
// which live in the DOM and ignore Object3D visibility.
export function Nearby({ center, radius, children }) {
  const [near, setNear] = useState(() => {
    const p = playerState.position;
    return Math.hypot(p.x - center[0], p.z - center[1]) < radius;
  });
  const nearRef = useRef(near);

  useFrame(() => {
    const p = playerState.position;
    const d = Math.hypot(p.x - center[0], p.z - center[1]);
    const next = nearRef.current ? d < radius + EXIT_PAD : d < radius;
    if (next !== nearRef.current) {
      nearRef.current = next;
      setNear(next);
    }
  });

  return near ? children : null;
}

export default Nearby;
