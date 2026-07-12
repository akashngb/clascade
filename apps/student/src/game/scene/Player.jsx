import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useKeyboard } from '../useKeyboard.js';
import { playerState } from '../playerState.js';
import { WORLD, GEO, COLLIDERS } from '../worldConfig.js';
import { floorAt } from '../worldGeometry.js';
import { playFootstep } from '../audio.js';

const MARGIN = 0.4; // keep the player this far off every wall
const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// Movement feel. Velocity chases the input direction instead of snapping, so
// starting/stopping has weight; stopping is quicker than starting so the
// player never feels like they're skating.
const SPRINT_MULT = 1.5;
const ACCEL = 14; // 1/s — how fast velocity chases the input
const DECEL = 18;
const BASE_FOV = 70;
const SPRINT_FOV = 76.5; // subtle FOV kick sells the speed change
const BOB_AMPLITUDE = 0.024; // metres of head bob — keep small (motion comfort)
const STRIDE = 2.1; // metres travelled between footstep sounds (walking)

// Is (x,z) blocked by a still-locked door? A locked door seals its doorway: the
// player can walk up to the threshold but not step through to the next room.
function blockedByLockedDoor(x, z, doorsOpen) {
  for (const door of GEO.doors) {
    if (doorsOpen[door.index]) continue;
    const halfW = door.width / 2 + 0.2;
    if (door.axis === 'z') {
      const aEdge = door.pos[2];
      if (Math.abs(x - door.pos[0]) < halfW && (z - aEdge) * door.cross.enterSign > -0.15) return true;
    } else {
      const aEdge = door.pos[0];
      if (Math.abs(z - door.pos[2]) < halfW && (x - aEdge) * door.cross.enterSign > -0.15) return true;
    }
  }
  return false;
}

// Inside a solid prop (specimen capsule, bench, big equipment)?
function insideCollider(x, z) {
  for (const c of COLLIDERS) {
    if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
  }
  return false;
}

const canStand = (x, z, doorsOpen) =>
  floorAt(x, z, GEO, MARGIN) !== null && !blockedByLockedDoor(x, z, doorsOpen) && !insideCollider(x, z);

// First-person walking controller. Mouse looks (pointer lock); WASD / arrows
// move, Shift sprints. Movement is velocity-based with acceleration/damping and
// validated per-axis against the facility geometry so the player slides along
// walls, glides up staircases, and is stopped cold by locked doors. Head bob
// and procedural footsteps are driven by actual horizontal speed.
export function Player({ enabled = true, doorsOpen, runId, onLockChange }) {
  const controls = useRef();
  const keys = useKeyboard();
  const { camera } = useThree();
  const lockedRef = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const groundY = useRef(WORLD.spawn[1]); // smoothed eye height (before bob)
  const bobPhase = useRef(0);
  const strideDist = useRef(0);

  // Spawn the camera in the first room on mount, and re-spawn on every new run
  // (begin / restart) — the Player never unmounts, so a lesson reset would
  // otherwise leave the camera stranded wherever the last run finished.
  useEffect(() => {
    camera.position.set(WORLD.spawn[0], WORLD.spawn[1], WORLD.spawn[2]);
    camera.fov = BASE_FOV;
    camera.updateProjectionMatrix();
    groundY.current = WORLD.spawn[1];
    velocity.current.set(0, 0, 0);
    bobPhase.current = 0;
    playerState.position.copy(camera.position);
    // Dev-only camera handle for inspecting the facility from a script.
    if (import.meta.env.DEV) window.__sqCamera = camera;
  }, [camera, runId]);

  useEffect(() => {
    if (!enabled && controls.current) controls.current.unlock();
  }, [enabled]);

  useFrame((_, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.05);
    if (!enabled || !lockedRef.current) return;

    const held = keys.current;
    const fwd = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
    const strafe = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
    const sprinting = held.has('ShiftLeft') || held.has('ShiftRight');
    const hasInput = Boolean(fwd || strafe);

    const p = camera.position;
    const vel = velocity.current;

    // Desired ground-plane velocity from input + camera yaw.
    let targetX = 0;
    let targetZ = 0;
    if (hasInput) {
      camera.getWorldDirection(FORWARD);
      FORWARD.y = 0;
      FORWARD.normalize();
      RIGHT.crossVectors(FORWARD, UP).normalize();
      const speed = WORLD.moveSpeed * (sprinting ? SPRINT_MULT : 1);
      const inv = 1 / Math.hypot(fwd, strafe); // diagonals aren't faster
      targetX = (FORWARD.x * fwd + RIGHT.x * strafe) * speed * inv;
      targetZ = (FORWARD.z * fwd + RIGHT.z * strafe) * speed * inv;
    }

    const k = 1 - Math.exp(-(hasInput ? ACCEL : DECEL) * delta);
    vel.x += (targetX - vel.x) * k;
    vel.z += (targetZ - vel.z) * k;
    if (!hasInput && Math.hypot(vel.x, vel.z) < 0.02) vel.set(0, 0, 0);

    // Move each axis independently so we slide along walls instead of sticking;
    // a blocked axis also kills its velocity so we don't push into the wall.
    const dx = vel.x * delta;
    const dz = vel.z * delta;
    if (dx) {
      if (canStand(p.x + dx, p.z, doorsOpen)) p.x += dx;
      else vel.x = 0;
    }
    if (dz) {
      if (canStand(p.x, p.z + dz, doorsOpen)) p.z += dz;
      else vel.z = 0;
    }

    // Smoothed floor-follow: stairs and level changes glide instead of stepping.
    const ground = floorAt(p.x, p.z, GEO);
    if (ground !== null) {
      const targetY = ground + WORLD.eyeHeight;
      groundY.current += (targetY - groundY.current) * (1 - Math.exp(-14 * delta));
    }

    // Head bob + footsteps, both driven by real horizontal speed.
    const speed2d = Math.hypot(vel.x, vel.z);
    let bob = 0;
    if (speed2d > 0.4) {
      bobPhase.current += delta * (5 + speed2d * 0.8);
      bob = Math.sin(bobPhase.current) * BOB_AMPLITUDE * Math.min(speed2d / WORLD.moveSpeed, 1.2);
      strideDist.current += speed2d * delta;
      const stride = sprinting ? STRIDE * 1.3 : STRIDE;
      if (strideDist.current >= stride) {
        strideDist.current = 0;
        playFootstep({ sprint: sprinting });
      }
    } else {
      bobPhase.current = 0;
      strideDist.current = STRIDE * 0.6; // first step lands quickly on set-off
    }
    p.y = groundY.current + bob;

    // Gentle FOV kick while sprinting.
    const targetFov = sprinting && speed2d > WORLD.moveSpeed * 1.02 ? SPRINT_FOV : BASE_FOV;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-8 * delta));
      camera.updateProjectionMatrix();
    }

    playerState.position.copy(p);
  });

  return (
    <PointerLockControls
      ref={controls}
      onLock={() => {
        lockedRef.current = true;
        playerState.locked = true;
        onLockChange?.(true);
      }}
      onUnlock={() => {
        lockedRef.current = false;
        playerState.locked = false;
        onLockChange?.(false);
      }}
    />
  );
}

export default Player;
