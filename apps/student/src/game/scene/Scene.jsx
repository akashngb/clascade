import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Player } from './Player.jsx';
import { Lab } from './Lab.jsx';
import { Atmosphere } from './Atmosphere.jsx';
import { EnvMap } from './EnvMap.jsx';
import { InteractionManager } from './InteractionManager.jsx';
import { WORLD, VIEW } from '../worldConfig.js';

export function Scene({
  phase,
  room,
  progress,
  playerEnabled,
  runId,
  doorsOpen,
  onDiscover,
  onPair,
  onEnterRoom,
  onReachPortal,
  onPrompt,
  onLockChange,
}) {
  // Dynamic resolution scaling: drop pixel ratio when frame time slips,
  // restore it when the machine proves it can keep up.
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: WORLD.spawn, fov: 70, near: 0.1, far: VIEW.far }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color('#eaf1f8');
      }}
    >
      <PerformanceMonitor
        flipflops={4}
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(Math.min(1.75, window.devicePixelRatio || 1.5))}
      />

      {/* Fog hides geometry before the far plane clips it, so nothing pops. */}
      <fog attach="fog" args={['#eaf1f8', VIEW.fogNear, VIEW.fogEnd]} />

      {/* Env map gives metals/roughness real reflections; fill lights lowered
          to compensate. Each room + corridor carries its own ceiling light. */}
      <EnvMap intensity={0.5} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#d3dde8', 0.55]} />

      <Suspense fallback={null}>
        <Lab
          foundBases={progress.basesFound}
          activePhaseId={phase.phaseId}
          assembly={{ pairIndex: progress.pairIndex, onPair }}
          doorsOpen={doorsOpen}
        />
      </Suspense>

      {/* Drifting dust motes across the whole facility — one draw call. */}
      <Atmosphere />

      <InteractionManager
        room={room}
        interactionType={phase.interaction.type}
        foundBases={progress.basesFound}
        onDiscover={onDiscover}
        onEnterRoom={onEnterRoom}
        onReachPortal={onReachPortal}
        onPrompt={onPrompt}
      />

      <Player enabled={playerEnabled} doorsOpen={doorsOpen} runId={runId} onLockChange={onLockChange} />

      {/* AA lives here (multisampling) since the canvas renders into the composer. */}
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.9} luminanceSmoothing={0.25} />
        <Vignette eskil={false} offset={0.3} darkness={0.35} />
      </EffectComposer>
    </Canvas>
  );
}

export default Scene;
