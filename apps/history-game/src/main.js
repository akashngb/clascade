import { createGame } from './game.js';
import { CameraDirector } from './CameraDirector.js';
import { FirstPersonControls } from './FirstPersonControls.js';
import { PhaseController } from './PhaseController.js';
import { loadAssets } from './AssetLoader.js';
import { initNarration, setMuted, isMuted, pauseNarration, resumeNarration } from './narration.js';
import { initMusic, pauseMusic, resumeMusic, setMusicMuted } from './music.js';
import * as ui from './ui.js';
import { isEmbedded, attachEmbedBridge } from './embed-bridge.js';

// Boot: build UI, load the Lesson Spec, wire the engine, and hand phase
// control to the teacher bar. Swap the spec URL and the same engine renders a
// different cinematic-timeline lesson.

async function boot() {
  ui.initUI();
  await Promise.all([initNarration(), initMusic()]);

  // Base-relative so the same build works standalone (base "/") and when hosted
  // under a subpath like /renderer/sarajevo/ inside the console (base "./").
  const BASE = import.meta.env.BASE_URL;
  const spec = await fetch(`${BASE}sarajevo-1914.json`).then((r) => r.json());
  const assets = await loadAssets(`${BASE}assets/manifest.json`);

  const game = createGame();
  const director = new CameraDirector(game.camera);
  const fp = new FirstPersonControls(game.camera, game.renderer.domElement);

  game.onUpdate((dt) => director.update(dt));
  game.onUpdate((dt) => fp.update(dt));

  const controller = new PhaseController(game, spec, director, fp, assets);
  window.__game = game;
  window.__controller = controller;

  ui.setChapters(spec.phases.map((p) => p.beatTitle));
  ui.onJumpTo((n) => controller.goToPhase(n));

  let paused = false;
  const setPaused = (p) => {
    paused = p;
    game.setPaused(paused);
    ui.setPaused(paused);
    if (paused) { pauseNarration(); pauseMusic(); }
    else { resumeNarration(); resumeMusic(); }
  };

  ui.onTeacherControls({
    onPrev: () => controller.prev(),
    onNext: () => controller.next(),
    onPause: () => setPaused(!paused),
    onMute: () => {
      setMuted(!isMuted());
      setMusicMuted(isMuted());
      ui.setMuteIcon(isMuted());
    },
  });

  if (isEmbedded()) {
    // Console (teacher) drives phases; students mirror. No local start gate.
    attachEmbedBridge({
      phaseCount: spec.phases.length,
      goToPhase: (n) => controller.goToPhase(n),
      setPaused,
      start: () => controller.start(),
    });
  } else {
    ui.onStart(() => {
      ui.hideStart();
      controller.start();
    });
  }
}

boot();
