import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import { makeHelix, bondTransform } from './geometry.js';
import { Nucleotide } from './Nucleotide.jsx';
import { RnaPolymerase } from './RnaPolymerase.jsx';
import { PAIRING, BASES, TEMPLATE_STRAND } from '../../lessons/dnaTranscription.js';
import theme from '../../theme.js';

// The hero object. Renders a template strand always, and reveals the
// complementary / mRNA strand rung-by-rung as the student solves pairs.
//
// modes:
//   'display'  -> both strands fully shown (structure viewing)
//   'explore'  -> both strands shown, template beads are clickable
//   'pairing'  -> partner strand builds up to `builtCount`
//
// Beads and rung bonds are grouped by base and drawn with instancing: one draw
// call per base colour instead of one mesh per bead (~40 draws → ~10).

const INSTANCE_LIMIT = TEMPLATE_STRAND.length * 2; // both strands, worst case

function BeadInstances({ base, items, clickable, onBaseClick }) {
  const color = (BASES[base] ?? { color: '#94a3b8' }).color;
  return (
    <Instances limit={INSTANCE_LIMIT}>
      <sphereGeometry args={[0.28, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.25} metalness={0.15} />
      {items.map((it) => (
        <Instance
          key={it.key}
          position={it.position}
          onClick={
            clickable
              ? (e) => {
                  e.stopPropagation();
                  onBaseClick?.(base);
                }
              : undefined
          }
          onPointerOver={clickable ? () => (document.body.style.cursor = 'pointer') : undefined}
          onPointerOut={clickable ? () => (document.body.style.cursor = 'auto') : undefined}
        />
      ))}
    </Instances>
  );
}

function BondInstances({ base, items }) {
  const color = (BASES[base] ?? { color: '#3b82f6' }).color;
  return (
    <Instances limit={INSTANCE_LIMIT}>
      <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.35} metalness={0.1} />
      {items.map((it) => (
        <Instance key={it.key} position={it.position} quaternion={it.quaternion} scale={[1, it.length, 1]} />
      ))}
    </Instances>
  );
}

export function DnaHelix({
  mode = 'display',
  pairingKind = 'dna',
  builtCount = 0,
  spin = 0.12,
  showEnzyme = false,
  radius = 1.25,
  height = 6,
  turns = 1.75,
  onBaseClick,
}) {
  const group = useRef();
  const count = TEMPLATE_STRAND.length;
  const { strandA, strandB, rungs } = useMemo(
    () => makeHelix({ count, radius, height, turns }),
    [count, radius, height, turns]
  );

  const backboneA = useMemo(() => new THREE.CatmullRomCurve3(strandA), [strandA]);
  const backboneB = useMemo(() => new THREE.CatmullRomCurve3(strandB), [strandB]);

  // Per-rung bond transforms never change with progress — compute once.
  const bondXforms = useMemo(
    () => rungs.map((rung, i) => ({ key: i, ...bondTransform(rung.a, rung.b) })),
    [rungs]
  );

  const partnerMap = pairingKind === 'transcription' ? PAIRING.transcription : PAIRING.dna;
  const activeIndex = mode === 'pairing' ? builtCount : -1;

  // Group beads / bonds by base colour for instanced drawing. The active rung's
  // template bead is excluded — it renders as a normal mesh so it can pulse.
  const { beadGroups, bondGroups } = useMemo(() => {
    const beads = {};
    const bonds = {};
    rungs.forEach((rung, i) => {
      const templateBase = TEMPLATE_STRAND[i];
      const revealed = mode !== 'pairing' || i < builtCount;
      if (i !== activeIndex) {
        (beads[templateBase] ??= []).push({ key: `t${i}`, position: rung.a.toArray() });
      }
      if (revealed) {
        const partnerBase = partnerMap[templateBase];
        (beads[partnerBase] ??= []).push({ key: `p${i}`, position: rung.b.toArray() });
        (bonds[templateBase] ??= []).push(bondXforms[i]);
      }
    });
    return { beadGroups: beads, bondGroups: bonds };
  }, [rungs, bondXforms, mode, builtCount, activeIndex, partnerMap]);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * spin;
    // Display centrepieces hover gently; working holograms stay put so the
    // active rung doesn't drift under the student's eye.
    if (mode === 'display') group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.07;
  });

  return (
    <group ref={group}>
      {/* Template backbone — always visible. */}
      <mesh>
        <tubeGeometry args={[backboneA, 64, 0.09, 8, false]} />
        <meshStandardMaterial
          color={theme.helix.backbone}
          emissive={theme.helix.backboneEmissive}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Partner backbone — dims until the strand is built during pairing. */}
      <mesh>
        <tubeGeometry args={[backboneB, 64, 0.09, 8, false]} />
        <meshStandardMaterial
          color={theme.helix.backbone}
          emissive={theme.helix.backboneEmissive}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={mode === 'pairing' ? 0.18 : 1}
        />
      </mesh>

      {Object.entries(bondGroups).map(([base, items]) => (
        <BondInstances key={`b-${base}`} base={base} items={items} />
      ))}
      {Object.entries(beadGroups).map(([base, items]) => (
        <BeadInstances
          key={`n-${base}`}
          base={base}
          items={items}
          clickable={mode === 'explore'}
          onBaseClick={onBaseClick}
        />
      ))}

      {/* The rung being solved pulses, so it stays a regular animated mesh. */}
      {activeIndex >= 0 && activeIndex < rungs.length && (
        <Nucleotide base={TEMPLATE_STRAND[activeIndex]} position={rungs[activeIndex].a.toArray()} pulse />
      )}

      {/* RNA polymerase clamps whichever rung is being transcribed next. */}
      {showEnzyme && rungs[Math.min(builtCount, rungs.length - 1)] && (
        <RnaPolymerase position={rungs[Math.min(builtCount, rungs.length - 1)].mid.toArray()} />
      )}
    </group>
  );
}

export default DnaHelix;
