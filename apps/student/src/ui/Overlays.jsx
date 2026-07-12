import { useState } from 'react';
import { BASES } from '../lessons/dnaTranscription.js';
import { MutationLab } from './MutationLab.jsx';

const LEGEND = ['A', 'T', 'C', 'G'];

export function IntroOverlay({ lesson, onBegin }) {
  return (
    <div className="sq-overlay">
      <div className="card sq-frame">
        <div className="sq-boot-bar">
          <span><b>BIO-LAB OS</b> · v1.0</span>
          <span>SYS.READY ▮</span>
        </div>
        <div className="sq-kicker">Molecular Biology Module</div>
        <h1 className="sq-title">{lesson.title}</h1>
        <p className="sq-sub">
          Your teacher’s slides on <b>DNA transcription</b> have been compiled into a walkable
          research facility. Traverse the nucleus, acquire the four nucleotide samples, and
          transcribe a gene by hand — one sealed chamber at a time.
        </p>

        <div className="sq-manifest">
          <div className="sq-manifest-head">
            <span>SPECIMEN MANIFEST</span>
            <span>4 NUCLEOTIDE BASES</span>
          </div>
          {LEGEND.map((b) => (
            <div className="sq-manifest-row" key={b}>
              <span className="swatch" style={{ background: BASES[b].color, color: BASES[b].color }} />
              <span className="code" style={{ color: BASES[b].color }}>{b}</span>
              <span className="name">{BASES[b].name}</span>
              <span className="pair">PAIRS · {BASES[b].pairsDna}</span>
            </div>
          ))}
        </div>

        <div className="sq-ctrlline">
          <b>CLICK</b> look · <b>WASD</b> move · <b>SHIFT</b> sprint · <b>E</b> interface · <b>ESC</b> release
        </div>

        <button className="sq-btn primary" onClick={onBegin}>
          ▶ Initiate Sequence
        </button>
      </div>
    </div>
  );
}

export function FinishOverlay({ progress, onRestart }) {
  const [mutating, setMutating] = useState(false);
  const accuracy = progress.fidelity;
  const grade = accuracy === 100 ? 'FLAWLESS' : accuracy >= 80 ? 'STRONG' : 'NEEDS REVIEW';

  return (
    <div className="sq-overlay">
      <div className="card sq-frame">
        <div className="sq-boot-bar">
          <span><b>ANALYSIS COMPLETE</b></span>
          <span>✓ ALL SECTORS CLEARED</span>
        </div>
        <div className="sq-kicker">Transcription Report</div>
        <h1 className="sq-title">
          Gene <span className="accent">Transcribed</span>
        </h1>

        {mutating ? (
          <>
            <p className="sq-sub">
              You built the strand — now break it. Mutate a base and watch the mRNA and the protein
              it codes for change in real time.
            </p>
            <MutationLab onBack={() => setMutating(false)} />
          </>
        ) : (
          <>
            <p className="sq-sub">
              You located the four bases, applied the complementary pairing rules by hand, and built an
              mRNA strand from a DNA template — exactly how your cells read a gene millions of times a second.
            </p>

            <div className="sq-readouts">
              <div className="sq-readouts-head">
                <span>RUN TELEMETRY</span>
                <span>SESSION 01</span>
              </div>
              <div className="sq-readout-row">
                <span className="k">Strand fidelity</span>
                <span className="dots" />
                <span className="v" style={{ color: accuracy >= 80 ? 'var(--good)' : 'var(--bad)' }}>{accuracy}%</span>
              </div>
              <div className="sq-readout-row">
                <span className="k">Bases placed correctly</span>
                <span className="dots" />
                <span className="v">{progress.correctPlacements}</span>
              </div>
              <div className="sq-readout-row">
                <span className="k">Mutations introduced</span>
                <span className="dots" />
                <span className="v" style={{ color: progress.mutations ? 'var(--bad)' : 'var(--good)' }}>{progress.mutations}</span>
              </div>
              <div className="sq-readout-row">
                <span className="k">Grade</span>
                <span className="dots" />
                <span className="v" style={{ color: 'var(--accent)' }}>{grade}</span>
              </div>
            </div>

            <div className="sq-station-actions">
              <button className="sq-btn" onClick={() => setMutating(true)}>
                ⚡ Explore mutations
              </button>
              <button className="sq-btn primary" onClick={onRestart}>
                ↻ Rerun Sequence
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
