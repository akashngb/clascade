import * as THREE from 'three';

// Walk + look controller for objective phases (spec §7: first_person_walk).
// Drag-to-look instead of pointer lock — friendlier for a classroom demo on
// Chromebooks (cursor stays visible, no fullscreen capture surprises).

const EYE_HEIGHT = 1.7;
const SPEED = 6.5; // metres / second

export class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.enabled = false;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.dragging = false;
    this.bounds = { minX: -22, maxX: 22, minZ: -60, maxZ: 20 };
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this._onKeyDown = (e) => this.keys.add(e.code);
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onDown = (e) => { if (e.button === 0) this.dragging = true; };
    this._onUp = () => { this.dragging = false; };
    this._onMove = (e) => {
      if (!this.dragging || !this.enabled) return;
      this.yaw -= e.movementX * 0.0025;
      this.pitch -= e.movementY * 0.0025;
      this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    };
  }

  enable(spawnPos, spawnYaw = 0) {
    this.enabled = true;
    if (spawnPos) {
      this.camera.position.set(spawnPos.x, EYE_HEIGHT, spawnPos.z);
    } else {
      this.camera.position.y = EYE_HEIGHT;
    }
    this.yaw = spawnYaw;
    this.pitch = 0;
    this.keys.clear();
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.dom.addEventListener('mousedown', this._onDown);
    window.addEventListener('mouseup', this._onUp);
    window.addEventListener('mousemove', this._onMove);
    this.dom.style.cursor = 'grab';
  }

  disable() {
    this.enabled = false;
    this.dragging = false;
    this.keys.clear();
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.dom.removeEventListener('mousedown', this._onDown);
    window.removeEventListener('mouseup', this._onUp);
    window.removeEventListener('mousemove', this._onMove);
    this.dom.style.cursor = '';
  }

  setBounds(b) { this.bounds = { ...this.bounds, ...b }; }

  update(dt) {
    if (!this.enabled) return;

    // Orientation
    this._euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);

    // Planar movement (ignore pitch so looking up doesn't fly you)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * dt);
      const p = this.camera.position;
      p.x = THREE.MathUtils.clamp(p.x + move.x, this.bounds.minX, this.bounds.maxX);
      p.z = THREE.MathUtils.clamp(p.z + move.z, this.bounds.minZ, this.bounds.maxZ);
      p.y = EYE_HEIGHT;
    }
  }

  get position() { return this.camera.position; }
}
