import { useEffect, useRef, useState } from 'react';
import { isMuted, setMuted } from '../game/audio.js';

function MuteButton() {
  const [muted, setLocal] = useState(isMuted());
  return (
    <button
      className="sq-mute"
      title={muted ? 'Unmute audio' : 'Mute audio'}
      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
      onClick={() => setLocal(setMuted(!muted))}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

const pad2 = (n) => String(n).padStart(2, '0');

// Compact progress ticks.
function Steps({ total, index }) {
  return (
    <div className="sq-steps">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`sq-step ${i === index ? 'active' : i < index ? 'done' : ''}`} />
      ))}
    </div>
  );
}

// The single always-on cue line: the terse "what do I do now". Explore progress
// collapses to four tiny base ticks; build phases show a rungs-sealed count.
function cueFor(phase, phaseIndex, total, phaseComplete, progress) {
  const it = phase.interaction;
  const isLast = phaseIndex === total - 1;
  if (phaseComplete) {
    return { done: true, text: isLast ? 'step into the export portal to finish' : 'door open — walk through →' };
  }
  if (it.type === 'explore') return { text: 'collect the sample vials', samples: progress.basesFound };
  if (it.type === 'pairing') {
    const label = it.mode === 'transcription' ? 'build the mRNA strand' : 'seal every base pair';
    return { text: `${label} — aim at a base, press [E]`, build: { built: progress.pairIndex, total: progress.totalPairs } };
  }
  return { text: 'proceed through the door when ready' };
}

export function Hud({ phase, phaseIndex, total, phaseComplete, progress, locked, interactPrompt }) {
  const it = phase.interaction;
  const cue = cueFor(phase, phaseIndex, total, phaseComplete, progress);
  // Show strand-building accuracy once the student has placed at least one base.
  const showFidelity = progress.correctPlacements + progress.mutations > 0;

  // Briefing auto-shows on entering a room, then fades out of the way. Press H
  // to bring it back (or hide it) any time.
  const [brief, setBrief] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    setBrief(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBrief(false), 6500);
    return () => clearTimeout(timer.current);
  }, [phaseIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyH') {
        clearTimeout(timer.current);
        setBrief((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="sq-hud sq-hud-min">
      {locked && <div className="sq-crosshair" />}

      {locked && interactPrompt && (
        <div className="sq-interact">
          <kbd>E</kbd> {interactPrompt}
        </div>
      )}

      <div className="sq-topwrap">
        <div className="sq-top">
          <Steps total={total} index={phaseIndex} />
          <span className="sq-tag">
            <b>ROOM {pad2(phaseIndex + 1)}</b> · {phase.beatTitle}
          </span>
          {showFidelity && (
            <span className={`sq-fidelity ${progress.fidelity < 100 ? 'warn' : ''}`} title="Strand-building accuracy">
              FIDELITY {progress.fidelity}%
              {progress.mutations > 0 && <small> · {progress.mutations} mut</small>}
            </span>
          )}
          <MuteButton />
        </div>

        <div className={`sq-brief ${brief ? '' : 'hide'}`}>
          <div className="sq-brief-head">
            <span>BRIEFING</span>
            <span>[H]</span>
          </div>
          <p>{phase.narration}</p>
          {it.objective && <p className="sq-brief-obj">▸ {it.objective}</p>}
        </div>
      </div>

      {!locked && (
        <div className="sq-hint">
          <b>CLICK</b> look · <b>WASD</b> move · <b>E</b> interact · <b>H</b> briefing · <b>ESC</b> release
        </div>
      )}

      <div className="sq-cuewrap">
        {cue && (
          <div className={`sq-cue ${cue.done ? 'done' : ''}`}>
            <span className="marker">{cue.done ? '✓' : '▸'}</span>
            <span>{cue.text}</span>
            {cue.samples && (
              <span className="sq-mini-samples">
                {['A', 'T', 'C', 'G'].map((b) => (
                  <span key={b} className={`sq-mini-b ${cue.samples.includes(b) ? 'got' : ''}`}>{b}</span>
                ))}
              </span>
            )}
            {cue.build && (
              <span className="sq-mini-build">
                {cue.build.built}/{cue.build.total} rungs
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Hud;
