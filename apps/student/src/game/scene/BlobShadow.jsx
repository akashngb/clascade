import * as THREE from 'three';

let blobTexture = null;
function getBlobTexture() {
  if (blobTexture) return blobTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(10, 16, 28, 0.4)');
  g.addColorStop(0.55, 'rgba(10, 16, 28, 0.18)');
  g.addColorStop(1, 'rgba(10, 16, 28, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  blobTexture = new THREE.CanvasTexture(canvas);
  return blobTexture;
}

// Cheap fake contact shadow: a radial-gradient plane laid on the floor. Sells
// "this object stands on the ground" without any shadow-mapped lights.
// `y` sits just above the floor grid overlay to avoid z-fighting.
export function BlobShadow({ radius = 1, y = 0.035, opacity = 1 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={getBlobTexture()} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

export default BlobShadow;
