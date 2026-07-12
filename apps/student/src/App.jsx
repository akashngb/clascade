import { useCallback, useMemo, useState } from 'react';
import { useLesson } from './game/useLesson.js';
import { roomForPhase } from './game/worldConfig.js';
import { Scene } from './game/scene/Scene.jsx';
import { Hud } from './ui/Hud.jsx';
import { IntroOverlay, FinishOverlay } from './ui/Overlays.jsx';
import './ui/panels.css';

export default function App() {
  const { lesson, phase, phaseIndex, phases, started, finished, runId, phaseComplete, progress, actions } =
    useLesson();

  const [locked, setLocked] = useState(false);
  const [interactPrompt, setInteractPrompt] = useState(null);

  const room = roomForPhase(phase.phaseId);
  const playerEnabled = started && !finished;

  // A door is open once its room has been cleared (or already passed). This is
  // what physically gates progress: the player can only walk into the next room
  // after finishing the current one.
  const doorsOpen = useMemo(
    () => phases.slice(0, -1).map((_, i) => i < phaseIndex || (i === phaseIndex && phaseComplete)),
    [phases, phaseIndex, phaseComplete]
  );

  // Walking into the next room (only possible once its door opened) advances.
  const handleEnterRoom = useCallback(
    (idx) => {
      if (idx > phaseIndex) actions.next();
    },
    [phaseIndex, actions]
  );

  const handleReachPortal = useCallback(() => actions.next(), [actions]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Scene
        phase={phase}
        room={room}
        progress={progress}
        playerEnabled={playerEnabled}
        runId={runId}
        doorsOpen={doorsOpen}
        onDiscover={actions.logBase}
        onPair={actions.submitPair}
        onEnterRoom={handleEnterRoom}
        onReachPortal={handleReachPortal}
        onPrompt={setInteractPrompt}
        onLockChange={setLocked}
      />

      {started && !finished && (
        <Hud
          phase={phase}
          phaseIndex={phaseIndex}
          total={phases.length}
          phaseComplete={phaseComplete}
          progress={progress}
          locked={locked}
          interactPrompt={interactPrompt}
        />
      )}

      {!started && <IntroOverlay lesson={lesson} onBegin={actions.begin} />}
      {finished && <FinishOverlay progress={progress} onRestart={actions.restart} />}
    </div>
  );
}
