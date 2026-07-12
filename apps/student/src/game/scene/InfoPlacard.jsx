import { Html } from '@react-three/drei';

// A wall-mounted briefing panel that shows the slide's heading + summary text
// inside the room. This is what makes "each slide tells you about something"
// literal: every room carries its own slide, readable in the world.
export function InfoPlacard({ position, rotation = [0, 0, 0], accent = '#5eead4', placard }) {
  return (
    <group position={position} rotation={rotation}>
      {/* backing board */}
      <mesh>
        <boxGeometry args={[4.6, 2.4, 0.12]} />
        <meshStandardMaterial color="#0e1728" metalness={0.5} roughness={0.5} emissive={accent} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 1.05, 0.07]}>
        <planeGeometry args={[4.6, 0.06]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      <Html
        position={[0, 0, 0.08]}
        center
        distanceFactor={7}
        transform
        occlude
        style={{ pointerEvents: 'none' }}
      >
        <div className="sq-placard" style={{ borderColor: accent }}>
          <div className="sq-placard-head" style={{ color: accent }}>{placard.heading}</div>
          <div className="sq-placard-body">{placard.body}</div>
        </div>
      </Html>
      <pointLight position={[0, 0, 1.4]} intensity={2.4} color={accent} distance={5} />
    </group>
  );
}

export default InfoPlacard;
