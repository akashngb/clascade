import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DnaHelix } from './DnaHelix.jsx';
import { BlobShadow } from './BlobShadow.jsx';
import { makeHelix } from './geometry.js';
import { playerState } from '../playerState.js';
import { BASES, PAIRING, TEMPLATE_STRAND } from '../../lessons/dnaTranscription.js';

// ---------------------------------------------------------------------------
// The hero mechanic. Instead of a 2D quiz modal, the student BUILDS the strand
// with their hands: a double helix stands in front of them with empty rungs, and
// four nucleotide bases float on pedestals. Aim the crosshair at a base, press E
// (or click), and it flies up to the open rung — the correct partner snaps in and
// locks; a wrong base slams into the rung and is rejected, counting as a mutation.
//
// No pointer unlock, no overlay: the pairing rules are enforced in-world, which
// is the whole "it's a game, not a slideshow" argument made physical.
// ---------------------------------------------------------------------------

const HELIX = { radius: 1.25, height: 5, turns: 1.75 };
const HELIX_LIFT = HELIX.height / 2 + 0.6;
const RANGE = 7.5; // how close the player must be to build
const AIM_CONE = 0.32; // radians off-centre the crosshair still grabs a base
const FRONT_DIST = 3.3; // how far bases float in front of the helix
const SPACING = 1.5; // gap between candidate pedestals
const DUR_OUT = 0.36; // grab flight time (seconds)
const DUR_BACK = 0.26; // reject recoil time

const easeOut = (u) => 1 - (1 - u) * (1 - u);
const CHOICES = { dna: ['A', 'T', 'C', 'G'], transcription: ['A', 'U', 'C', 'G'] };

export function AssemblyStation({ origin, facing = [1, 0], mode = 'dna', pairIndex, onPair }) {
  const { camera } = useThree();
  const flyRef = useRef();
  const flyMat = useRef();
  const flashRef = useRef();
  const ringRef = useRef();
  const candRefs = useRef([]);

  const total = TEMPLATE_STRAND.length;
  const complete = pairIndex >= total;
  const transcription = mode === 'transcription';
  const choices = CHOICES[transcription ? 'transcription' : 'dna'];
  const partnerMap = transcription ? PAIRING.transcription : PAIRING.dna;

  // Local-space rung anchors (station group is unrotated, so world = local + origin).
  const rungs = useMemo(() => makeHelix({ count: total, ...HELIX }).rungs, [total]);
  const slotLocal = (i) => {
    const b = rungs[i].b;
    return new THREE.Vector3(b.x, HELIX_LIFT + b.y, b.z);
  };

  // Candidate pedestal positions: a shallow row in front of the helix, on the
  // side the player approaches from (facing points candidate -> helix).
  const candidates = useMemo(() => {
    const f = new THREE.Vector3(facing[0], 0, facing[1]).normalize();
    const perp = new THREE.Vector3(-f.z, 0, f.x);
    return choices.map((base, i) => {
      const lateral = perp.clone().multiplyScalar((i - (choices.length - 1) / 2) * SPACING);
      const along = f.clone().multiplyScalar(-FRONT_DIST);
      return { base, pos: new THREE.Vector3(along.x + lateral.x, 1.2, along.z + lateral.z) };
    });
  }, [facing, choices]);

  // The in-flight base (imperative so per-frame motion never re-renders React).
  const flight = useRef({ active: false });
  const aimed = useRef(-1);

  const grab = (index) => {
    if (flight.current.active || complete || !playerState.locked) return;
    const inRange = Math.hypot(playerState.position.x - origin[0], playerState.position.z - origin[2]) < RANGE;
    if (!inRange) return;
    const cand = candidates[index];
    const correct = cand.base === partnerMap[TEMPLATE_STRAND[pairIndex]];
    const from = cand.pos.clone();
    const to = slotLocal(pairIndex);
    flight.current = {
      active: true,
      correct,
      base: cand.base,
      from,
      to,
      mid: from.clone().lerp(to, 0.66),
      phase: 'out',
      t: 0,
    };
    if (flyMat.current) flyMat.current.color.set(BASES[cand.base].color);
  };

  // E or a click grabs whatever base the crosshair is on.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyE' && !e.repeat && aimed.current >= 0) grab(aimed.current);
    };
    const onClick = () => {
      if (aimed.current >= 0) grab(aimed.current);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }); // re-bound each render so grab() closes over the latest pairIndex

  const fwd = useRef(new THREE.Vector3());
  const toCand = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // ---- targeting: pick the candidate nearest the crosshair, in range -------
    const inRange =
      !complete &&
      playerState.locked &&
      Math.hypot(playerState.position.x - origin[0], playerState.position.z - origin[2]) < RANGE;
    let best = -1;
    if (inRange && !flight.current.active) {
      camera.getWorldDirection(fwd.current);
      let bestDot = Math.cos(AIM_CONE);
      candidates.forEach((c, i) => {
        toCand.current.set(origin[0] + c.pos.x, origin[1] + c.pos.y, origin[2] + c.pos.z).sub(camera.position).normalize();
        const dot = toCand.current.dot(fwd.current);
        if (dot > bestDot) {
          bestDot = dot;
          best = i;
        }
      });
    }
    aimed.current = best;

    // candidate idle bob + highlight the aimed one
    const time = state.clock.elapsedTime;
    candRefs.current.forEach((ref, i) => {
      if (!ref) return;
      ref.position.y = 1.2 + Math.sin(time * 1.6 + i) * 0.05;
      const target = i === best ? 1.28 : 1;
      ref.scale.x += (target - ref.scale.x) * Math.min(1, delta * 12);
      ref.scale.setScalar(ref.scale.x);
    });
    if (ringRef.current) {
      if (best >= 0) {
        const c = candidates[best];
        ringRef.current.visible = true;
        ringRef.current.position.set(c.pos.x, 1.2, c.pos.z);
        ringRef.current.rotation.z = time * 1.5;
      } else {
        ringRef.current.visible = false;
      }
    }

    // ---- flight + reject animation ------------------------------------------
    const fl = flight.current;
    if (fl.active && flyRef.current) {
      fl.t += delta;
      let pos;
      if (fl.correct) {
        const u = Math.min(1, fl.t / DUR_OUT);
        pos = fl.from.clone().lerp(fl.to, easeOut(u));
        if (u >= 1) {
          fl.active = false;
          if (flashRef.current) flashRef.current.userData.flash = { color: '#4ade80', t: 0 };
          onPair(true);
        }
      } else if (fl.phase === 'out') {
        const u = Math.min(1, fl.t / DUR_OUT);
        pos = fl.from.clone().lerp(fl.mid, easeOut(u));
        if (u >= 1) {
          fl.phase = 'back';
          fl.t = 0;
          if (flashRef.current) flashRef.current.userData.flash = { color: '#f87171', t: 0 };
        }
      } else {
        const u = Math.min(1, fl.t / DUR_BACK);
        pos = fl.mid.clone().lerp(fl.from, u);
        if (u >= 1) {
          fl.active = false;
          onPair(false);
        }
      }
      flyRef.current.visible = true;
      flyRef.current.position.copy(pos);
    } else if (flyRef.current) {
      flyRef.current.visible = false;
    }

    // ---- feedback flash light ------------------------------------------------
    if (flashRef.current) {
      const f = flashRef.current.userData.flash;
      if (f) {
        f.t += delta;
        const k = Math.max(0, 1 - f.t / 0.5);
        flashRef.current.intensity = k * 14;
        flashRef.current.color.set(f.color);
        if (k <= 0) flashRef.current.userData.flash = null;
      } else {
        flashRef.current.intensity = 0;
      }
    }
  });

  const templateBase = complete ? null : TEMPLATE_STRAND[pairIndex];

  return (
    <group position={origin}>
      <BlobShadow radius={2.4} />
      {/* dais under the helix */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[2, 2.2, 0.4, 32]} />
        <meshStandardMaterial color="#0c1422" metalness={0.7} roughness={0.35} emissive="#22d3ee" emissiveIntensity={0.18} />
      </mesh>

      {/* the strand being built — no spin so the open rung stays put under the aim */}
      <group position={[0, HELIX_LIFT, 0]}>
        <DnaHelix
          mode="pairing"
          pairingKind={transcription ? 'transcription' : 'dna'}
          builtCount={pairIndex}
          showEnzyme={transcription}
          spin={0}
          radius={HELIX.radius}
          height={HELIX.height}
          turns={HELIX.turns}
        />
      </group>

      {/* candidate bases on pedestals */}
      {candidates.map((c, i) => (
        <group key={c.base}>
          <mesh position={[c.pos.x, 0.5, c.pos.z]}>
            <cylinderGeometry args={[0.34, 0.42, 1, 20]} />
            <meshStandardMaterial color="#0e1728" metalness={0.5} roughness={0.5} emissive={BASES[c.base].color} emissiveIntensity={0.15} />
          </mesh>
          <group ref={(el) => (candRefs.current[i] = el)} position={[c.pos.x, 1.2, c.pos.z]}>
            <mesh>
              <sphereGeometry args={[0.32, 20, 20]} />
              <meshStandardMaterial color={BASES[c.base].color} emissive={BASES[c.base].color} emissiveIntensity={0.6} roughness={0.25} metalness={0.15} />
            </mesh>
            <Html position={[0, 0.62, 0]} center distanceFactor={12}>
              <div className="sq-basechip" style={{ color: BASES[c.base].color, borderColor: `${BASES[c.base].color}66` }}>
                {c.base}
              </div>
            </Html>
          </group>
        </group>
      ))}

      {/* crosshair selector ring, moved onto the aimed base each frame */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.5, 0.03, 8, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      {/* the base currently flying to the rung */}
      <mesh ref={flyRef} visible={false}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial ref={flyMat} color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>

      <pointLight ref={flashRef} position={[0, HELIX_LIFT, 0]} intensity={0} distance={9} color="#4ade80" />

      {/* in-world guidance — replaces the old 2D console prompt */}
      <Html position={[0, HELIX.height + 1.3, 0]} center distanceFactor={18}>
        <div className="sq-buildcard">
          {complete ? (
            <>
              <b className="ok">STRAND SEALED ✓</b>
              <small>every rung paired — the door is open</small>
            </>
          ) : (
            <>
              <b>
                RUNG {pairIndex + 1}/{total} · template{' '}
                <span style={{ color: BASES[templateBase].color }}>{templateBase}</span>
              </b>
              <small>
                aim at the {transcription ? 'matching mRNA base' : 'complementary base'} and press <kbd>E</kbd>
              </small>
            </>
          )}
        </div>
      </Html>
    </group>
  );
}

export default AssemblyStation;
