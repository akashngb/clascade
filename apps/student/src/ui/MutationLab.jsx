import { useMemo, useState } from 'react';
import { BASES } from '../lessons/dnaTranscription.js';
import { GENE_TEMPLATE, DNA_BASES, transcribe, translate, describeEffect } from '../lessons/genetics.js';

// Interactive gene-mutation deep-dive. The student mutates a short gene and
// watches the mRNA and resulting protein change in real time, classified live
// as silent / missense / nonsense / frameshift. All biology lives in genetics.js
// so the readouts are always correct.
const MODES = [
  { id: 'substitution', label: 'SUBSTITUTE', hint: 'tap a base to swap it (A→T→C→G)' },
  { id: 'insertion', label: 'INSERT', hint: 'tap a base to insert one before it' },
  { id: 'deletion', label: 'DELETE', hint: 'tap a base to remove it' },
];

const nextBase = (b) => DNA_BASES[(DNA_BASES.indexOf(b) + 1) % DNA_BASES.length];
const baseColor = (b) => BASES[b]?.color ?? '#9fb0c7';

function Strand({ label, bases, changed, onTap }) {
  return (
    <div className="sq-mut-strandrow">
      <span className="sq-mut-rowlabel">{label}</span>
      <div className="sq-mut-strand">
        {bases.map((b, i) => (
          <button
            key={i}
            className={`sq-mut-base ${changed?.has(i) ? 'changed' : ''} ${onTap ? 'live' : ''}`}
            style={{ color: baseColor(b), borderColor: changed?.has(i) ? baseColor(b) : undefined }}
            onClick={onTap ? () => onTap(i) : undefined}
            disabled={!onTap}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}

function Protein({ codons }) {
  return (
    <div className="sq-mut-protein">
      {codons.map((c, i) => (
        <span key={i} className={`sq-aa ${c.aa === '*' ? 'stop' : ''}`}>
          <b>{c.name}</b>
          <small>{c.codon}</small>
        </span>
      ))}
      {codons.length === 0 && <span className="sq-aa stop"><b>—</b></span>}
    </div>
  );
}

export function MutationLab({ onBack }) {
  const [mode, setMode] = useState('substitution');
  const [gene, setGene] = useState(GENE_TEMPLATE);

  const mrna = transcribe(gene);
  const protein = useMemo(() => translate(mrna), [mrna]);
  const effect = useMemo(() => describeEffect(GENE_TEMPLATE, gene), [gene]);

  // Which template positions differ from the original (for highlighting subs).
  const changed = useMemo(() => {
    const set = new Set();
    if (gene.length === GENE_TEMPLATE.length) {
      gene.forEach((b, i) => b !== GENE_TEMPLATE[i] && set.add(i));
    }
    return set;
  }, [gene]);

  const tap = (i) => {
    setGene((g) => {
      const next = [...g];
      if (mode === 'substitution') next[i] = nextBase(g[i]);
      else if (mode === 'insertion') next.splice(i, 0, 'A');
      else if (mode === 'deletion' && next.length > 3) next.splice(i, 1);
      return next;
    });
  };

  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <div className="sq-mut">
      <div className="sq-mut-modes">
        {MODES.map((m) => (
          <button key={m.id} className={`sq-mut-mode ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
        <button className="sq-mut-reset" onClick={() => setGene(GENE_TEMPLATE)}>↺ RESET GENE</button>
      </div>
      <div className="sq-mut-hint">{activeMode.hint}</div>

      <Strand label="DNA" bases={gene} changed={changed} onTap={tap} />
      <Strand label="mRNA" bases={mrna.split('')} />
      <div className="sq-mut-strandrow">
        <span className="sq-mut-rowlabel">PROT</span>
        <Protein codons={protein} />
      </div>

      <div className={`sq-mut-effect ${effect.type}`}>
        <span className="sq-mut-badge">{effect.label}</span>
        <p>{effect.detail}</p>
      </div>

      <div className="sq-mut-foot">
        <button className="sq-btn primary" onClick={onBack}>← Back to report</button>
      </div>
    </div>
  );
}

export default MutationLab;
