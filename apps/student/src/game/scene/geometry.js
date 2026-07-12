import * as THREE from 'three';

// Generate the anchor points for a vertical double helix.
// Returns two parallel strands plus the midpoints (used to place base rungs).
export function makeHelix({ count, radius = 1.25, height = 6, turns = 1.75 }) {
  const strandA = [];
  const strandB = [];
  const rungs = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const angle = t * turns * Math.PI * 2;
    const y = (t - 0.5) * height;
    const a = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    const b = new THREE.Vector3(
      Math.cos(angle + Math.PI) * radius,
      y,
      Math.sin(angle + Math.PI) * radius
    );
    strandA.push(a);
    strandB.push(b);
    rungs.push({ a, b, mid: a.clone().add(b).multiplyScalar(0.5), t, y });
  }
  return { strandA, strandB, rungs };
}

const UP = new THREE.Vector3(0, 1, 0);

// Compute the transform needed to draw a unit-height cylinder as a bond between
// two points. Three's cylinder is Y-aligned and centered, so we position at the
// midpoint, scale Y to the distance, and rotate Y onto the direction vector.
export function bondTransform(from, to) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return { position: mid.toArray(), quaternion, length };
}
