import * as THREE from 'three';

// The camera-move vocabulary the spec's cameraScript can invoke (spec §4.1).
// The director plays a queue of named, duration-driven moves. Smooth easing
// and continuity between moves is where "cinematic" is won — good camera work
// on grey-boxes reads better than good models with a static camera.

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export class CameraDirector {
  constructor(camera) {
    this.camera = camera;
    this.queue = [];
    this.current = null;
    this.ctx = {};
    this._resolve = null;
    this._probe = new THREE.Object3D(); // for computing lookAt quaternions
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
    c.elapsed += dt;
    const t = Math.min(c.elapsed / c.duration, 1);
    this._apply(c, t);
    if (t >= 1) this._next();
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
        const start = focal.clone().add(fwd.clone().multiplyScalar(-16)).setY(7);
        const end = focal.clone().add(fwd.clone().multiplyScalar(-11)).setY(5.5);
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
          .add(forward.clone().multiplyScalar(-7.5)) // behind
          .add(right.clone().multiplyScalar(3))       // to the side
          .setY(3.2);                                 // camera height
        const blend = Math.min(c.elapsed / 1.3, 1);
        cam.position.lerpVectors(c.startPos, desired, easeOut(blend));
        const look = target.clone().add(forward.clone().multiplyScalar(3)).setY(1.3);
        cam.quaternion.copy(this._lookQuat(cam.position, look));
        break;
      }

      // Orbit a focal point, time-dilated. Sweeps ~160°.
      case 'slow_motion_orbit': {
        const center = (this.ctx.actor ? this.ctx.actor.position : focal).clone();
        const radius = this.ctx.orbitRadius || 12;
        const height = this.ctx.orbitHeight || 5.5;
        const startAngle = this.ctx.orbitStart ?? Math.PI * 0.25;
        const angle = startAngle + easeInOut(t) * Math.PI * 0.9;
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
        break;
      }

      default:
        break;
    }
  }
}
