import * as THREE from 'three';

// Single shared, mutable player position. The Player writes it every frame and
// InteractionManager / world beacons read it, all inside useFrame, so proximity
// checks never trigger React re-renders. One game instance = one player.
export const playerState = {
  position: new THREE.Vector3(0, 1.7, 10),
  locked: false,
};

export default playerState;
