import { useCallback, useMemo, useState } from 'react';
import { lesson as defaultLesson, TEMPLATE_STRAND } from '../lessons/dnaTranscription.js';
import { playEvent } from './audio.js';

// Central lesson state machine. Owns the current phase and per-interaction
// progress. All mutations return NEW state (immutable) per project style rules.
// Telemetry hook points are stubbed so the pipeline/analytics side (CLAUDE.md
// §6.3) can subscribe later without touching the renderer.
export function useLesson(lesson = defaultLesson) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  // Bumped on begin/restart so the renderer can teleport the player back to the
  // spawn — the Player never remounts, so a state reset alone leaves the camera
  // stranded wherever the last run ended.
  const [runId, setRunId] = useState(0);

  // Interaction progress buckets, keyed by phaseId so phases stay independent.
  const [basesFound, setBasesFound] = useState([]); // p2 explore
  const [pairIndex, setPairIndex] = useState(0); // p3/p4 current rung
  const [pairErrors, setPairErrors] = useState(0); // wrong placements THIS phase

  // Lesson-cumulative accuracy telemetry (survives phase changes; drives the
  // finish report and the "mutation" feedback in the build station). Every wrong
  // base the student snaps onto the strand is a mutation the cell would have made.
  const [correctPlacements, setCorrectPlacements] = useState(0);
  const [mutations, setMutations] = useState(0);

  const phases = lesson.phases;
  const phase = phases[phaseIndex];
  const totalPairs = TEMPLATE_STRAND.length;

  const emit = useCallback(
    (event, payload = {}) => {
      // Sampled SFX + ambient are driven off this same event stream.
      playEvent(event);
      // Placeholder telemetry sink. Real build writes to Firestore
      // sessions/{code}/events (CLAUDE.md §6.2).
      if (typeof window !== 'undefined' && window.__SQ_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[telemetry]', phase?.phaseId, event, payload);
      }
    },
    [phase]
  );

  const phaseComplete = useMemo(() => {
    if (!phase) return false;
    const it = phase.interaction;
    switch (it.type) {
      case 'cinematic':
        return true; // advanced manually via Continue
      case 'explore':
        return basesFound.length >= 4;
      case 'pairing':
        return pairIndex >= totalPairs;
      default:
        return true;
    }
  }, [phase, basesFound, pairIndex, totalPairs]);

  const resetInteraction = useCallback(() => {
    setBasesFound([]);
    setPairIndex(0);
    setPairErrors(0);
  }, []);

  const goTo = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(phases.length - 1, index));
      resetInteraction();
      setPhaseIndex(clamped);
      emit('phase_enter', { index: clamped });
    },
    [phases.length, resetInteraction, emit]
  );

  const next = useCallback(() => {
    if (phaseIndex >= phases.length - 1) {
      setFinished(true);
      emit('lesson_complete');
      return;
    }
    goTo(phaseIndex + 1);
  }, [phaseIndex, phases.length, goTo, emit]);

  const prev = useCallback(() => goTo(phaseIndex - 1), [phaseIndex, goTo]);

  const begin = useCallback(() => {
    setStarted(true);
    setRunId((r) => r + 1);
    emit('lesson_start');
  }, [emit]);

  const restart = useCallback(() => {
    resetInteraction();
    setCorrectPlacements(0);
    setMutations(0);
    setPhaseIndex(0);
    setFinished(false);
    setStarted(true);
    setRunId((r) => r + 1);
  }, [resetInteraction]);

  // --- interaction callbacks -------------------------------------------------
  const logBase = useCallback(
    (base) => {
      setBasesFound((found) => (found.includes(base) ? found : [...found, base]));
      emit('base_identified', { base });
    },
    [emit]
  );

  const submitPair = useCallback(
    (correct) => {
      if (correct) {
        setPairIndex((i) => i + 1);
        setCorrectPlacements((n) => n + 1);
        emit('pair_correct', { rung: pairIndex });
      } else {
        setPairErrors((e) => e + 1);
        setMutations((m) => m + 1);
        emit('pair_wrong', { rung: pairIndex });
      }
      return correct;
    },
    [pairIndex, emit]
  );

  // Strand-building accuracy over the whole lesson. 100% until the first
  // placement so an untouched run never reads as a failure.
  const attempts = correctPlacements + mutations;
  const fidelity = attempts === 0 ? 100 : Math.round((correctPlacements / attempts) * 100);

  return {
    lesson,
    phases,
    phase,
    phaseIndex,
    started,
    finished,
    runId,
    phaseComplete,
    progress: { basesFound, pairIndex, pairErrors, totalPairs, correctPlacements, mutations, fidelity },
    actions: { begin, next, prev, goTo, restart, logBase, submitPair },
  };
}

export default useLesson;
