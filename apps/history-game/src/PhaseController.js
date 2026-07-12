import * as THREE from 'three';
import { buildStreet, buildAllianceMap, buildQuizRoom } from './environments.js';
import * as ui from './ui.js';
import { playNarration, stopNarration } from './narration.js';
import { playPhaseMusic } from './music.js';

// Sequences the lesson phase by phase and wires each interaction type to the
// scene. Teacher-controlled: it never auto-advances (spec §6.2) — next()/prev()
// come from the teacher bar. Telemetry events are emitted by name so a
// Firestore transport can consume them later.

const ENV_BUILDERS = {
  sarajevo_street: buildStreet,
  alliance_map: buildAllianceMap,
  quiz_room: buildQuizRoom,
};

export class PhaseController {
  constructor(game, spec, director, fp, assets = { models: {} }) {
    this.game = game;
    this.spec = spec;
    this.director = director;
    this.fp = fp;
    this.assets = assets;
    this.index = -1;
    this.envs = {};       // cached by environment name
    this.activeEnvName = null;
    this.env = null;
    this._cleanup = [];
    this._transitioning = false;
    window.__telemetry = [];
    // Ambient life (water, flags, crowd sway) for whichever env is active.
    this.game.onUpdate((dt) => this.env?.update?.(dt));
  }

  emit(evt, data = {}) {
    const phase = this.spec.phases[this.index];
    const record = { t: Date.now(), phaseId: phase?.phaseId, evt, ...data };
    window.__telemetry.push(record);
    console.log('[telemetry]', evt, record);
  }

  getEnv(name) {
    if (!this.envs[name]) {
      const build = ENV_BUILDERS[name] || buildStreet;
      const env = build(this.game.scene, this.assets);
      env.group.visible = false;
      this.envs[name] = env;
    }
    return this.envs[name];
  }

  setActiveEnv(name) {
    if (this.activeEnvName === name) return;
    for (const key in this.envs) this.envs[key].group.visible = false;
    this.env = this.getEnv(name);
    this.env.group.visible = true;
    this.activeEnvName = name;

    // Apply this environment's backdrop + fog to the shared scene.
    if (this.env.background) this.game.scene.background = this.env.background;
    if (this.env.fog && this.game.scene.fog) {
      this.game.scene.fog.color.set(this.env.fog.color);
      this.game.scene.fog.density = this.env.fog.density;
    }
  }

  start() { this.goToPhase(0); }
  next() { if (this.index < this.spec.phases.length - 1) this.goToPhase(this.index + 1); }
  prev() { if (this.index > 0) this.goToPhase(this.index - 1); }

  runCleanup() {
    this._cleanup.forEach((fn) => fn());
    this._cleanup = [];
  }

  async goToPhase(n) {
    if (this._transitioning || n < 0 || n >= this.spec.phases.length) return;
    this._transitioning = true;

    await ui.fade(true);
    stopNarration();
    this.director.stop();
    this.fp.disable();
    this.runCleanup();
    this._narrationEnd = null;
    this._resolveAtMin = false;
    ui.hideObjective();
    ui.hidePrompt();
    ui.hideSubtitle();
    ui.showHint(false);
    ui.setTimer(null);

    this.index = n;
    const phase = this.spec.phases[n];
    this.setActiveEnv(phase.scene.environment);

    ui.setPhaseInfo(n, this.spec.phases.length, phase.beatTitle);
    ui.setNavEnabled(n > 0, n < this.spec.phases.length - 1);

    await ui.fade(false);
    playPhaseMusic(phase.phaseId);
    this.emit('phase_enter');

    // Chapter title card, then narration.
    ui.showTitleCard(
      `${this.spec.subject.toUpperCase()} · GRADE ${this.spec.gradeLevel}`,
      phase.beatTitle
    );
    setTimeout(() => ui.hideTitleCard(), 2800);

    setTimeout(() => {
      if (this.index !== n) return; // teacher already moved on
      ui.showSubtitle(phase.narration.text);
      playNarration(phase.phaseId, phase.narration.text, { onEnd: () => this._narrationEnd?.() });
    }, 900);

    this._transitioning = false;
    this.setupInteraction(phase);
  }

  setupInteraction(phase) {
    const type = phase.interaction?.type || 'none';
    if (phase.phaseId === 'phase-4') return this.setupSafetyPhase(phase);
    switch (type) {
      case 'objective': return this.setupObjective(phase);
      case 'explore': return this.setupExplore(phase);
      case 'quiz': return this.setupQuiz(phase);
      default: return this.setupCinematic(phase);
    }
  }

  ctxFor(phase, actor = null) {
    return {
      focal: this.env.focal.clone(),
      forward: this.env.forward.clone(),
      actor,
      orbitRadius: this.env.orbitRadius,
      orbitHeight: this.env.orbitHeight,
    };
  }

  // --- Cinematic (interaction: none) ---
  setupCinematic(phase) {
    ui.setCinematic(true);

    // Phase 3: drive the car down the quay and visibly turn it into Franz
    // Josef Street — the wrong turn is a real turn into a real corner. The
    // route lives in the environment next to the geometry it must thread.
    let actor = null;
    const ctx = this.ctxFor(phase, actor);
    if (phase.phaseId === 'phase-3' && this.env.car && this.env.wrongTurn) {
      actor = this.env.car;
      this.animateAlong(actor, this.env.wrongTurn.path, 12);
      ctx.actor = actor;
      // Orbit the stopped car from the quay side of the junction, clear of
      // both building rows and Schiller's corner.
      ctx.orbitRadius = 5.5;
      ctx.orbitHeight = 3.0;
      ctx.orbitStart = -0.35;
      ctx.orbitSweep = 0.7;
    }

    this.director.playSequence(phase.scene.cameraScript, ctx);
  }

  // Move an object along a waypoint path over `duration`, facing travel dir.
  animateAlong(obj, path, duration) {
    let elapsed = 0;
    const total = path.length - 1;
    const stop = this.game.onUpdate((dt) => {
      elapsed = Math.min(elapsed + dt, duration);
      const u = (elapsed / duration) * total;
      const seg = Math.min(Math.floor(u), total - 1);
      const f = u - seg;
      const a = path[seg], b = path[seg + 1];
      obj.position.lerpVectors(a, b, f);
      const dir = b.clone().sub(a);
      if (dir.lengthSq() > 0.0001) obj.rotation.y = Math.atan2(dir.x, dir.z);
      if (elapsed >= duration) stop();
    });
    this._cleanup.push(stop);
  }

  // --- Objective (move-to-point + examine) ---
  setupObjective(phase) {
    ui.setCinematic(false);
    ui.showObjective(phase.interaction.objective);
    ui.showHint(true);
    this.fp.enable(new THREE.Vector3(3, 0, 12), 0);
    if (this.env.fpBounds) this.fp.setBounds(this.env.fpBounds);

    const target = this.env.newspaperStand.position;
    let opened = false;
    let done = false;

    const stop = this.game.onUpdate(() => {
      if (done) return;
      const d = this.fp.position.distanceTo(target);
      if (d < 4 && !opened) ui.showPrompt('Read the headline');
      else if (d >= 4) ui.hidePrompt();
    });
    this._cleanup.push(stop);

    const onKey = (e) => {
      if (e.code !== 'KeyE' || done) return;
      if (this.fp.position.distanceTo(target) < 4) {
        opened = true;
        ui.hidePrompt();
        ui.showHeadline(
          'Heir to Visit Sarajevo Today',
          'Archduke Franz Ferdinand and the Duchess Sophie will tour the city this morning. The full route of the imperial motorcade, printed here, runs along the Appel Quay past the town hall.',
          () => {
            done = true;
            ui.markObjectiveDone();
            this.emit('objective_complete', { completionEvent: phase.interaction.completionEvent });
          }
        );
      }
    };
    window.addEventListener('keydown', onKey);
    this._cleanup.push(() => window.removeEventListener('keydown', onKey));
  }

  // --- Safety-adjusted phase (phase 4): failable objective -> cutaway ---
  setupSafetyPhase(phase) {
    ui.setCinematic(false);
    ui.showObjective(phase.interaction.objective);
    ui.showHint(true);
    this.fp.enable(new THREE.Vector3(4.5, 0, 2), 0.8);
    if (this.env.fpBounds) this.fp.setBounds(this.env.fpBounds);

    // Car stalled where the wrong turn left it — in front of Schiller's,
    // across the junction from the player; the crowd knot is in between.
    const stall = this.env.wrongTurn?.stop || new THREE.Vector3(-2.5, 0, -9);
    if (this.env.car) {
      this.env.car.position.copy(stall);
      this.env.car.rotation.y = this.env.wrongTurn?.stopYaw ?? -0.3;
    }

    const carPos = stall.clone();
    let resolved = false;
    let elapsed = 0;
    const MIN_TIME = 8;   // keep the moment on screen at least this long
    const CAP_TIME = 24;  // hard fallback if narration-end never fires (muted)

    const resolve = () => {
      if (resolved) return;
      resolved = true;
      ui.hideObjective();
      this.fp.disable();
      ui.setCinematic(true);
      // Cutaway that keeps the scene framed (crane to a high 3/4 on the car),
      // never a bare sky shot. Narration has already finished, so nothing is cut.
      const ctx = this.ctxFor(phase);
      ctx.focal = carPos.clone();
      this.director.playSequence([{ move: 'cutaway', duration: 5.5 }], ctx).then(() => {
        ui.showTitleCard('10:45 A.M. · 28 JUNE 1914', 'The shot that started a war.');
        this.emit('objective_complete', { completionEvent: phase.interaction.completionEvent, reached: false });
      });
    };

    // Never interrupt narration: wait for it to finish (with a minimum on-screen
    // time). Reaching the car does not trigger the cutaway.
    this._narrationEnd = () => {
      if (elapsed >= MIN_TIME) resolve();
      else this._resolveAtMin = true;
    };

    const stop = this.game.onUpdate((dt) => {
      if (resolved) return;
      elapsed += dt;
      if (this._resolveAtMin && elapsed >= MIN_TIME) resolve();
      if (elapsed >= CAP_TIME) resolve();
    });
    this._cleanup.push(stop);
    this._cleanup.push(() => { resolved = true; });
  }

  // --- Explore (alliance map, click to examine each nation) ---
  setupExplore(phase) {
    ui.setCinematic(true);
    ui.showObjective(phase.interaction.objective);
    this.director.playSequence(phase.scene.cameraScript, this.ctxFor(phase));

    const nodes = this.env.nodes || [];
    let examined = 0;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onClick = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, this.game.camera);
      const hit = raycaster.intersectObjects(nodes, false)[0];
      if (!hit) return;
      const node = hit.object;
      ui.showSubtitle(`${node.userData.name} — ${node.userData.note}`);
      if (!node.userData.examined) {
        node.userData.examined = true;
        node.material.emissiveIntensity = 1.1;
        examined++;
        this.emit('npc_question_asked', { nation: node.userData.id }); // reuse: "examined"
        if (examined >= nodes.length) {
          ui.markObjectiveDone();
          this.emit('objective_complete', { completionEvent: phase.interaction.completionEvent });
        }
      }
    };
    this.game.renderer.domElement.addEventListener('click', onClick);
    this._cleanup.push(() => this.game.renderer.domElement.removeEventListener('click', onClick));
  }

  // --- Quiz checkpoint ---
  setupQuiz(phase) {
    ui.setCinematic(false);
    // Frame the platform.
    this.game.camera.position.set(0, 4.5, 12);
    this.game.camera.lookAt(0, 2, 0);

    if (this.env.rings) {
      const stop = this.game.onUpdate((dt) => { this.env.rings.rotation.y += dt * 0.3; });
      this._cleanup.push(stop);
    }

    setTimeout(() => {
      if (this.index !== this.spec.phases.indexOf(phase)) return;
      ui.showQuiz(phase.interaction.quiz, (score, total) => {
        this.emit('quiz_answer', { score, total });
        this.emit('objective_complete', { completionEvent: phase.interaction.completionEvent });
        ui.showRecap({
          score,
          total,
          onReplay: () => this.goToPhase(0),
        });
      });
    }, 2600);
  }
}
