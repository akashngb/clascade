import * as THREE from 'three';

// The 3D core: renderer, scene, camera and the render loop.
// Chromebook budget (spec §7): capped pixel ratio, ACES tone mapping for the
// "good lighting beats good models" look, fog for depth, no heavy postprocessing.

export function createGame() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0908);
  scene.fog = new THREE.FogExp2(0x0a0908, 0.012);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 40, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Chromebook cap
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('app').appendChild(renderer.domElement);

  const clock = new THREE.Clock();
  const updaters = new Set();

  // Anything needing per-frame updates registers here (controllers, animations).
  function onUpdate(fn) { updaters.add(fn); return () => updaters.delete(fn); }

  let paused = false;
  function setPaused(v) { paused = v; }

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05); // clamp for tab-switch spikes
    if (!paused) {
      for (const fn of updaters) fn(dt);
    }
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  tick();

  return { scene, camera, renderer, clock, onUpdate, setPaused };
}
