import { createGame } from './game.js';
import { CameraDirector } from './CameraDirector.js';
import { FirstPersonControls } from './FirstPersonControls.js';
import { PhaseController } from './PhaseController.js';
import { initNarration, setMuted, isMuted } from './narration.js';
import * as ui from './ui.js';

// Boot: build UI, load the Lesson Spec, wire the engine, and hand phase
// control to the teacher bar. Swap the spec URL and the same engine renders a
// different cinematic-timeline lesson.

async function boot() {
  ui.initUI();
  initNarration();

  const spec = await fetch('/sarajevo-1914.json').then((r) => r.json());

  const game = createGame();
  const director = new CameraDirector(game.camera);
  const fp = new FirstPersonControls(game.camera, game.renderer.domElement);

  game.onUpdate((dt) => director.update(dt));
  game.onUpdate((dt) => fp.update(dt));

  const controller = new PhaseController(game, spec, director, fp);

  let paused = false;
  ui.onTeacherControls({
    onPrev: () => controller.prev(),
    onNext: () => controller.next(),
    onPause: () => {
      paused = !paused;
      game.setPaused(paused);
      ui.setPaused(paused);
      if (paused && 'speechSynthesis' in window) window.speechSynthesis.pause();
      else if ('speechSynthesis' in window) window.speechSynthesis.resume();
    },
    onMute: () => {
      setMuted(!isMuted());
      ui.setMuteIcon(isMuted());
    },
  });

  ui.onStart(() => {
    ui.hideStart();
    controller.start();
  });
}

boot();
