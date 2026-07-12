// ---------------------------------------------------------------------------
// GENETICS — the molecular biology the mutation lab needs, kept in code so the
// science is always correct. Standard genetic code, transcription, translation,
// and a mutation-effect classifier (silent / missense / nonsense / frameshift).
// ---------------------------------------------------------------------------

// DNA template base -> mRNA base (transcription). A pairs with U in RNA.
const TRANSCRIBE = { A: 'U', T: 'A', C: 'G', G: 'C' };

// Standard genetic code: mRNA codon (5'->3') -> amino acid single letter.
// '*' marks a STOP codon.
export const CODON_TABLE = {
  UUU: 'F', UUC: 'F', UUA: 'L', UUG: 'L',
  CUU: 'L', CUC: 'L', CUA: 'L', CUG: 'L',
  AUU: 'I', AUC: 'I', AUA: 'I', AUG: 'M',
  GUU: 'V', GUC: 'V', GUA: 'V', GUG: 'V',
  UCU: 'S', UCC: 'S', UCA: 'S', UCG: 'S',
  CCU: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACU: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  GCU: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  UAU: 'Y', UAC: 'Y', UAA: '*', UAG: '*',
  CAU: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAU: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  GAU: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  UGU: 'C', UGC: 'C', UGA: '*', UGG: 'W',
  CGU: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGU: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  GGU: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

// Single letter -> 3-letter name, for readable readouts.
export const AA_NAMES = {
  F: 'Phe', L: 'Leu', I: 'Ile', M: 'Met', V: 'Val', S: 'Ser', P: 'Pro',
  T: 'Thr', A: 'Ala', Y: 'Tyr', H: 'His', Q: 'Gln', N: 'Asn', K: 'Lys',
  D: 'Asp', E: 'Glu', C: 'Cys', W: 'Trp', R: 'Arg', G: 'Gly', '*': 'STOP',
};

export const DNA_BASES = ['A', 'T', 'C', 'G'];

// A short demonstration gene for the mutation lab, chosen so that a SINGLE
// substitution can produce every effect type (silent / missense / nonsense),
// and any insert/delete shows a frameshift. Transcribes to AUG-UAC-AAG
// (Met-Tyr-Lys); mutating the Tyr codon reaches a STOP in one step.
export const GENE_TEMPLATE = ['T', 'A', 'C', 'A', 'T', 'G', 'T', 'T', 'C'];

// Transcribe a DNA template (array of bases) into an mRNA string.
export function transcribe(template) {
  return template.map((b) => TRANSCRIBE[b] ?? '?').join('');
}

// Translate mRNA into codons + amino acids, reading in-frame from the start.
// Trailing bases that don't complete a codon are ignored; translation ends at
// the first STOP codon (as the ribosome does).
export function translate(mrna) {
  const out = [];
  for (let i = 0; i + 3 <= mrna.length; i += 3) {
    const codon = mrna.slice(i, i + 3);
    const aa = CODON_TABLE[codon] ?? '?';
    out.push({ codon, aa, name: AA_NAMES[aa] ?? '???' });
    if (aa === '*') break;
  }
  return out;
}

// Apply a mutation to a DNA template, returning a NEW template array.
//  { kind: 'substitution', pos, base } — replace the base at pos
//  { kind: 'insertion', pos, base }    — insert a base before pos
//  { kind: 'deletion', pos }           — remove the base at pos
export function applyMutation(template, mut) {
  const next = [...template];
  if (mut.kind === 'substitution') next[mut.pos] = mut.base;
  else if (mut.kind === 'insertion') next.splice(mut.pos, 0, mut.base);
  else if (mut.kind === 'deletion') next.splice(mut.pos, 1);
  return next;
}

const aaSeq = (protein) => protein.map((p) => p.aa).join('');

// Classify a mutation's effect by comparing the original and mutated proteins.
// Returns { type, label, detail }.
export function classifyEffect(template, mut) {
  const original = translate(transcribe(template));
  const mutated = translate(transcribe(applyMutation(template, mut)));

  if (mut.kind === 'insertion' || mut.kind === 'deletion') {
    return {
      type: 'frameshift',
      label: 'FRAMESHIFT',
      detail:
        `A single ${mut.kind === 'insertion' ? 'inserted' : 'deleted'} base shifts the ` +
        'reading frame, so every codon downstream is misread — usually scrambling the whole protein.',
    };
  }

  const before = aaSeq(original);
  const after = aaSeq(mutated);

  if (before === after) {
    return {
      type: 'silent',
      label: 'SILENT',
      detail: 'The codon still spells the same amino acid, so the protein is unchanged. The genetic code is redundant.',
    };
  }
  if (after.includes('*') && !before.slice(0, after.indexOf('*')).includes('*') && after.length < before.length) {
    return {
      type: 'nonsense',
      label: 'NONSENSE',
      detail: 'The change created a premature STOP codon, so the protein is cut short and usually non-functional.',
    };
  }
  return {
    type: 'missense',
    label: 'MISSENSE',
    detail: 'One codon now codes for a different amino acid — the protein is built but altered at that position.',
  };
}

// Describe the effect of a whole edited gene vs its original (handles the
// mutation lab's cumulative edits, including length-changing indels).
export function describeEffect(original, current) {
  if (original.length === current.length && original.every((b, i) => b === current[i])) {
    return { type: 'none', label: 'WILD TYPE', detail: 'No mutation yet — this is the original gene. Change, insert, or delete a base to see what happens.' };
  }
  if (current.length !== original.length) {
    return {
      type: 'frameshift',
      label: 'FRAMESHIFT',
      detail: 'Inserting or deleting a base shifts the reading frame, so every codon downstream is misread — usually wrecking the whole protein.',
    };
  }
  const before = aaSeq(translate(transcribe(original)));
  const after = aaSeq(translate(transcribe(current)));
  if (before === after) {
    return { type: 'silent', label: 'SILENT', detail: 'The codon still spells the same amino acid — the protein is unchanged. The genetic code is redundant.' };
  }
  if (after.includes('*') && !before.includes('*')) {
    return { type: 'nonsense', label: 'NONSENSE', detail: 'The change created a premature STOP codon, so the protein is cut short and usually non-functional.' };
  }
  return { type: 'missense', label: 'MISSENSE', detail: 'A codon now codes for a different amino acid — the protein is built, but altered at that position.' };
}

export default { transcribe, translate, applyMutation, classifyEffect, describeEffect };
