// ---------------------------------------------------------------------------
// LESSON SPEC — "Journey Through the Gene: DNA Transcription"
//
// This is the SlideQuest Lesson Spec (IR) that the renderer consumes. In the
// real product this JSON is generated from the teacher's uploaded slides by the
// pipeline (see CLAUDE.md §3). For the biology hero demo it is hand-authored so
// the game is clean and deterministic. Each `phase` ≈ one slide / concept beat.
//
// The renderer NEVER hard-codes lesson content — it reads everything from here.
// Swap this file (or generate a new one) and the same engine plays a new lesson.
// ---------------------------------------------------------------------------

// Complementary base-pairing rules (DNA template -> mRNA). Used by the pairing
// mini-game and by the helix builder so the biology is always correct in code.
export const PAIRING = {
  dna: { A: 'T', T: 'A', C: 'G', G: 'C' },
  // Transcription: DNA template base -> mRNA base (adenine pairs with uracil).
  transcription: { A: 'U', T: 'A', C: 'G', G: 'C' },
};

export const BASES = {
  A: { name: 'Adenine', color: '#4ade80', pairsDna: 'T', pairsRna: 'U' },
  T: { name: 'Thymine', color: '#f87171', pairsDna: 'A', pairsRna: 'A' },
  C: { name: 'Cytosine', color: '#60a5fa', pairsDna: 'G', pairsRna: 'G' },
  G: { name: 'Guanine', color: '#fbbf24', pairsDna: 'C', pairsRna: 'C' },
  U: { name: 'Uracil', color: '#c084fc', pairsDna: 'A', pairsRna: null },
};

// The template DNA strand the student will transcribe (read 3'->5').
export const TEMPLATE_STRAND = ['T', 'A', 'C', 'G', 'A', 'T', 'G', 'C'];

export const lesson = {
  lessonId: 'bio-dna-transcription-v1',
  title: 'Journey Through the Gene',
  subject: 'biology',
  gradeLevel: 9,
  template: 'scale_journey',
  status: 'published',

  phases: [
    {
      phaseId: 'p1-arrival',
      beatTitle: 'Shrinking Into the Cell',
      learningObjective: 'Orient the student inside a living cell and locate the nucleus.',
      narration:
        'Welcome to the bio-lab. Inside that glowing containment capsule ahead floats a strand of ' +
        'real human DNA — the specimen you’ll study today. The other capsules hold samples for future ' +
        'missions. Click to look around and use W A S D to walk over and inspect the DNA.',
      camera: { position: [0, 1.7, 13], target: [0, 4, 0], fov: 70 },
      environment: 'nucleus',
      interaction: { type: 'cinematic', durationHint: 8 },
      hint: 'Walk around, then press Continue.',
    },
    {
      phaseId: 'p2-helix',
      beatTitle: 'The Double Helix',
      learningObjective: 'Identify the double-helix structure and the four bases (A, T, C, G).',
      narration:
        'This twisted ladder is DNA. Its two rails are sugar-phosphate backbones, and every rung ' +
        'is a pair of bases. There are only four: Adenine, Thymine, Cytosine and Guanine. The lab ' +
        'has a sample vial of each — go collect them.',
      camera: { position: [6, 1.5, 8], target: [0, 0, 0], fov: 50 },
      environment: 'nucleus',
      interaction: {
        type: 'explore',
        objective: 'Walk up to each of the 4 glowing sample vials and press E to collect them.',
        completionEvent: 'all_bases_found',
      },
      hint: 'Walk to the colored sample vials and press E to collect each base.',
    },
    {
      phaseId: 'p3-pairing',
      beatTitle: 'Base Pairing Rules',
      learningObjective: 'Apply complementary base pairing: A–T and C–G.',
      narration:
        'The two strands are not random — each base has exactly one partner. Adenine always pairs ' +
        'with Thymine, and Cytosine always pairs with Guanine. Complete each rung by choosing the ' +
        'correct partner.',
      camera: { position: [0, 0.5, 6], target: [0, 0, 0], fov: 45 },
      environment: 'nucleus',
      interaction: {
        type: 'pairing',
        mode: 'dna',
        objective: 'Step up to the analysis terminal, press E, and match A–T and C–G to seal every rung.',
        completionEvent: 'pairs_complete',
      },
      hint: 'Approach the analysis terminal and press E to pair the bases.',
    },
    {
      phaseId: 'p4-transcription',
      beatTitle: 'Transcription: Reading the Gene',
      learningObjective: 'Transcribe a DNA template into mRNA (A→U, T→A, C→G, G→C).',
      narration:
        'To use a gene, the cell copies it into messenger RNA. An enzyme called RNA polymerase ' +
        'unzips the helix and reads the template strand. RNA uses Uracil instead of Thymine, so ' +
        'Adenine now pairs with Uracil. Build the mRNA strand, one base at a time.',
      camera: { position: [0, 0.8, 7], target: [0, 0, 0], fov: 48 },
      environment: 'nucleus',
      interaction: {
        type: 'pairing',
        mode: 'transcription',
        objective: 'Return to the analysis terminal, press E, and build the mRNA strand, base by base (A→U).',
        completionEvent: 'mrna_built',
      },
      hint: 'Approach the terminal. Pick the RNA base that matches each template base.',
    },
    {
      phaseId: 'p5-export',
      beatTitle: 'The Message Leaves',
      learningObjective: 'Summarize that mRNA carries the gene’s code out to build proteins.',
      narration:
        'The finished mRNA strand detaches and slips out of the nucleus toward the ribosomes, where ' +
        'it will be read to build a protein. You just watched a gene switch on. That is transcription.',
      camera: { position: [0, 3, 14], target: [0, 0, -4], fov: 55 },
      environment: 'cytoplasm',
      interaction: { type: 'cinematic', durationHint: 7 },
      hint: 'Watch the mRNA travel out, then finish the lesson.',
    },
  ],
};

export default lesson;
