import * as THREE from 'three';

// The camera-move vocabulary the spec's cameraScript can invoke (spec §4.1).
// The director plays a queue of named, duration-driven moves. Smooth easing
// and continuity between moves is where "cinematic" is won — good camera work
// on grey-boxes reads better than good models with a static camera.

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Handheld weight per move — how much the operator's breathing shows.
// The corner shot trembles the most: it is a bystander's eye.
const DRIFT = {
  date_title_cinematic: 0.8,
  crane_down_to_street: 0.6,
  follow_actor: 1.2,
  corner_watch: 1.6,
  slow_motion_orbit: 0.7,
  cutaway: 0.4,
};

export class CameraDirector {
  constructor(camera) {
    this.camera = camera;
    this.queue = [];
    this.current = null;
    this.ctx = {};
    this._resolve = null;
    // Probe for computing lookAt quaternions. MUST be a camera: Object3D's
    // lookAt points +Z at the target, while cameras view along -Z — a plain
    // probe hands the camera a quaternion facing 180° away from its subject.
    this._probe = new THREE.PerspectiveCamera();
    this._t = 0; // running time for handheld drift
    this._driftEuler = new THREE.Euler();
    this._driftQuat = new THREE.Quaternion();
  }

  // Build a quaternion that looks from `pos` toward `target`.
  _lookQuat(pos, target) {
    this._probe.position.copy(pos);
    this._probe.up.set(0, 1, 0);
    this._probe.lookAt(target);
    return this._probe.quaternion.clone();
  }

  // ctx: { focal:Vector3, forward:Vector3, actor:Object3D, orbitRadius, orbitHeight }
  playSequence(script, ctx = {}) {
    this.ctx = ctx;
    // first_person_walk yields control to the FP controller; the director skips it.
    this.queue = (script || [])
      .filter((s) => s.move !== 'first_person_walk')
      .map((s) => ({ ...s }));
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._next();
    });
  }

  _next() {
    if (!this.queue.length) {
      this.current = null;
      const r = this._resolve;
      this._resolve = null;
      r?.();
      return;
    }
    const entry = this.queue.shift();
    this.current = {
      name: entry.move,
      duration: Math.max(entry.duration || 3, 0.25),
      elapsed: 0,
      startPos: this.camera.position.clone(),
      startQuat: this.camera.quaternion.clone(),
      startFov: this.camera.fov,
    };
  }

  // Cut a running sequence short (e.g. teacher jumps phases).
  stop() {
    this.queue = [];
    this.current = null;
    const r = this._resolve;
    this._resolve = null;
    r?.();
  }

  get isPlaying() {
    return !!this.current;
  }

  update(dt) {
    const c = this.current;
    if (!c) return;
    this._t += dt;
    c.elapsed += dt;
    const t = Math.min(c.elapsed / c.duration, 1);
    this._apply(c, t);
    this._applyDrift(DRIFT[c.name] ?? 0.5);
    if (t >= 1) this._next();
  }

  // Handheld weight: layered slow sines on top of whatever _apply framed.
  // Recomputed fresh every frame from the move's clean output, so it never
  // accumulates or fights the underlying motion.
  _applyDrift(scale) {
    const t = this._t;
    const cam = this.camera;
    cam.position.y += (Math.sin(t * 0.9) * 0.02 + Math.sin(t * 2.1) * 0.008) * scale;
    this._driftEuler.set(
      (Math.sin(t * 0.7) * 0.0035 + Math.sin(t * 1.9) * 0.0015) * scale,
      (Math.sin(t * 0.55 + 1.7) * 0.004 + Math.sin(t * 1.3 + 0.4) * 0.0015) * scale,
      Math.sin(t * 0.42 + 3.1) * 0.0022 * scale
    );
    this._driftQuat.setFromEuler(this._driftEuler);
    cam.quaternion.multiply(this._driftQuat);
  }

  _apply(c, t) {
    const cam = this.camera;
    const focal = this.ctx.focal ? this.ctx.focal.clone() : new THREE.Vector3();
    const fwd = this.ctx.forward ? this.ctx.forward.clone().normalize() : new THREE.Vector3(0, 0, -1);

    switch (c.name) {
      // Establishing dolly under the title card. Entry is hidden by a fade, so
      // it uses a designed start rather than the captured camera state.
      case 'date_title_cinematic': {
        const e = easeInOut(t);
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
        const start = focal.clone().add(fwd.clone().multiplyScalar(-16)).add(right.clone().multiplyScalar(-3)).setY(7);
        const end = focal.clone().add(fwd.clone().multiplyScalar(-10.5)).add(right.clone().multiplyScalar(2.5)).setY(5.2);
        cam.position.lerpVectors(start, end, e);
        cam.quaternion.copy(this._lookQuat(cam.position, focal.clone().setY(3)));
        break;
      }

      // Crane from the sky down to eye level — continuous from wherever we were.
      case 'crane_down_to_street': {
        const e = easeInOut(t);
        const end = focal.clone().add(fwd.clone().multiplyScalar(-10)).setY(2.4);
        cam.position.lerpVectors(c.startPos, end, e);
        const endQuat = this._lookQuat(end, focal.clone().setY(2));
        cam.quaternion.slerpQuaternions(c.startQuat, endQuat, e);
        break;
      }

      // Trail a moving actor from behind-and-to-the-side, looking past it in
      // its travel direction so the scene ahead (not the empty end) is framed.
      case 'follow_actor': {
        const actor = this.ctx.actor;
        const target = actor ? actor.position.clone() : focal;
        const ry = actor ? actor.rotation.y : 0;
        const forward = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        const desired = target.clone()
          .add(forward.clone().multiplyScalar(-4.5)) // close behind
          .add(right.clone().multiplyScalar(2))       // slightly to the side
          .setY(2.2);                                 // low, dramatic
        const blend = Math.min(c.elapsed / 1.3, 1);
        cam.position.lerpVectors(c.startPos, desired, easeOut(blend));
        // Look at the car body so it fills the upper-centre, clear of the
        // subtitle band along the bottom.
        const look = target.clone().add(forward.clone().multiplyScalar(1)).setY(1.1);
        cam.quaternion.copy(this._lookQuat(cam.position, look));
        break;
      }

      // A hard cut to a fixed position — a bystander on the corner — that
      // tracks the actor as it approaches and turns toward camera, with a
      // slow push-in. This is the shot where the wrong turn becomes personal.
      case 'corner_watch': {
        const actor = this.ctx.actor;
        const base = this.ctx.cornerCam || focal.clone().add(new THREE.Vector3(3, 1.7, -5));
        const look = (actor ? actor.position.clone() : focal.clone()).setY(1.2);
        const toLook = look.clone().sub(base).setY(0).normalize();
        cam.position.copy(base).add(toLook.multiplyScalar(easeInOut(t) * 1.4));
        cam.quaternion.copy(this._lookQuat(cam.position, look));
        break;
      }

      // Orbit a focal point, time-dilated. Sweeps ~160°.
      case 'slow_motion_orbit': {
        const center = (this.ctx.actor ? this.ctx.actor.position : focal).clone();
        const radius = this.ctx.orbitRadius || 12;
        const height = this.ctx.orbitHeight || 5.5;
        const startAngle = this.ctx.orbitStart ?? Math.PI * 0.25;
        const sweep = this.ctx.orbitSweep ?? Math.PI * 0.9;
        const angle = startAngle + easeInOut(t) * sweep;
        const desired = center.clone().add(
          new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius)
        );
        const blend = Math.min(c.elapsed / 1.0, 1);
        cam.position.lerpVectors(c.startPos, desired, easeOut(blend));
        cam.quaternion.copy(this._lookQuat(cam.position, center.setY(1.8)));
        break;
      }

      // Safety cutaway: crane up and back to a high 3/4 while keeping the focal
      // (the scene) in frame — a "pull away from the moment", never a bare sky
      // shot. PhaseController resolves it with a date card. No player action.
      case 'cutaway': {
        const e = easeInOut(t);
        const center = focal.clone();
        const end = center.clone().add(new THREE.Vector3(7, 11, 11));
        cam.position.lerpVectors(c.startPos, end, e);
        const endQuat = this._lookQuat(end, center.setY(1.2));
        cam.quaternion.slerpQuaternions(c.startQuat, endQuat, e);
        // The world slowly widens away from the moment.
        cam.fov = c.startFov + e * 7;
        cam.updateProjectionMatrix();
        break;
      }

      default:
        break;
    }
  }
}
