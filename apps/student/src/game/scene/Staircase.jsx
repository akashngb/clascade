import { CORRIDOR_W } from '../worldGeometry.js';

// Renders visible steps over a ramp corridor. Collision uses the smooth ramp
// height (worldGeometry.floorAt), so the player glides up while the eye sees a
// staircase — robust (Y is computed, never simulated) but still reads as stairs.
export function Staircase({ corridor }) {
  const { axis, rampFrom: f, rampTo: t } = corridor;
  const alongLo = axis === 'z' ? corridor.minZ : corridor.minX;
  const alongHi = axis === 'z' ? corridor.maxZ : corridor.maxX;
  const crossMid = axis === 'z' ? (corridor.minX + corridor.maxX) / 2 : (corridor.minZ + corridor.maxZ) / 2;

  // Floor height at each end of the run, so the tread lerp works either way.
  const floorAtLo = f.at <= t.at ? f.y : t.y;
  const floorAtHi = f.at <= t.at ? t.y : f.y;
  const rise = Math.abs(floorAtHi - floorAtLo);
  const steps = Math.max(4, Math.round(rise / 0.32));
  const depth = (alongHi - alongLo) / steps;

  const treadTopAt = (frac) => floorAtLo + (floorAtHi - floorAtLo) * frac;

  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const treadTop = treadTopAt((i + 0.5) / steps) + 0.02;
        const along = alongLo + depth * (i + 0.5);
        const px = axis === 'z' ? crossMid : along;
        const pz = axis === 'z' ? along : crossMid;
        // Box grows from the ground up to the tread so the side profile steps.
        return (
          <mesh key={i} position={[px, Math.abs(treadTop) / 2, pz]}>
            <boxGeometry
              args={axis === 'z' ? [CORRIDOR_W, Math.abs(treadTop), depth + 0.02] : [depth + 0.02, Math.abs(treadTop), CORRIDOR_W]}
            />
            <meshStandardMaterial color="#dfe7f0" metalness={0.15} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

export default Staircase;
