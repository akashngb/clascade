import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { playerState } from '../playerState.js';
import { GEO, DISCOVER_RANGE } from '../worldConfig.js';
import { roomIndexAt } from '../worldGeometry.js';
import { BASES } from '../../lessons/dnaTranscription.js';

const distXZ = (p, x, z) => Math.hypot(p.x - x, p.z - z);

// Runs inside the Canvas. Each frame it compares the player's position to the
// CURRENT room's interactive objects and reports the nearest interactable via
// onPrompt ("press E to …"); pressing E acts on it. Walking into the next room
// still advances the lesson (you can only get there once its door unlocked).
// The pairing/transcription build station manages its own aiming and input, so
// it does not appear here — this only handles vial pickups and room/portal entry.
export function InteractionManager({
  room,
  interactionType,
  foundBases,
  onDiscover,
  onEnterRoom,
  onReachPortal,
  onPrompt,
}) {
  const lastRoom = useRef(-1);
  const portalFired = useRef(false);
  const target = useRef(null); // nearest interactable this frame
  const lastPrompt = useRef(null);

  // Keep latest handlers in a ref so the key listener never goes stale.
  const handlers = useRef({});
  handlers.current = { onDiscover };

  // Interacting is an explicit choice: E acts on whatever is in range.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'KeyE' || e.repeat) return;
      const t = target.current;
      if (!t) return;
      if (t.kind === 'vial') handlers.current.onDiscover?.(t.base);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame(() => {
    const p = playerState.position;
    const props = room?.props ?? {};
    let t = null;

    // Advance-by-walking: report the room the player is physically inside.
    const idx = roomIndexAt(p.x, p.z, GEO);
    if (idx !== -1 && idx !== lastRoom.current) {
      lastRoom.current = idx;
      onEnterRoom?.(idx);
    }

    // Explore: the nearest uncollected vial in range becomes the E target.
    if (interactionType === 'explore' && props.vials) {
      let best = Infinity;
      for (const vial of props.vials) {
        if (foundBases.includes(vial.base)) continue;
        const d = distXZ(p, vial.pos[0], vial.pos[1]);
        if (d < DISCOVER_RANGE && d < best) {
          best = d;
          t = { kind: 'vial', base: vial.base, prompt: `collect the ${BASES[vial.base].name} sample` };
        }
      }
    }

    // Final room: walk into the export portal to finish.
    if (props.portal && !portalFired.current && distXZ(p, props.portal.pos[0], props.portal.pos[1]) < 2.4) {
      portalFired.current = true;
      onReachPortal?.();
    }

    target.current = t;
    const promptText = t ? t.prompt : null;
    if (promptText !== lastPrompt.current) {
      lastPrompt.current = promptText;
      onPrompt?.(promptText);
    }
  });

  return null;
}

export default InteractionManager;
