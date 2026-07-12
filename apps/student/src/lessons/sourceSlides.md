# Source Slides (demo fixture)

This is the "boring slideshow" a teacher would upload. In the real product the
pipeline (CLAUDE.md §2) turns it into the Lesson Spec `dnaTranscription.js`. Kept
here so the slide → phase mapping is obvious for the demo. Each slide ≈ one phase.

| # | Slide title (teacher's deck)            | → Phase          | Interaction it became            |
|---|------------------------------------------|------------------|----------------------------------|
| 1 | "Cells and the Nucleus"                  | p1-arrival       | cinematic fly-in                 |
| 2 | "Structure of DNA — the Double Helix"    | p2-helix         | explore + identify the 4 bases   |
| 3 | "Complementary Base Pairing (A-T, C-G)"  | p3-pairing       | match-the-partner mini-game      |
| 4 | "Transcription: DNA → mRNA"              | p4-transcription | build mRNA with RNA polymerase   |
| 5 | "mRNA Leaves the Nucleus"                | p5-export        | cinematic recap                  |

## Slide bullet content (what OCR/beat-extraction would pull)

**Slide 1 — Cells and the Nucleus**
- Every cell contains a nucleus
- The nucleus stores DNA
- DNA holds the instructions for life

**Slide 2 — Structure of DNA**
- DNA is a double helix (twisted ladder)
- Rails = sugar-phosphate backbone
- Rungs = base pairs
- Four bases: Adenine, Thymine, Cytosine, Guanine

**Slide 3 — Base Pairing**
- Adenine pairs with Thymine (A–T)
- Cytosine pairs with Guanine (C–G)
- Pairing is always complementary

**Slide 4 — Transcription**
- RNA polymerase unzips the DNA
- Reads the template strand
- Builds mRNA; RNA uses Uracil instead of Thymine (A→U)

**Slide 5 — mRNA Leaves the Nucleus**
- mRNA exits to the ribosomes
- Ribosomes read mRNA to build proteins
- This whole process = transcription
