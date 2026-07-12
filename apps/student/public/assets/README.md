# Biology Lesson Assets

Drop better art here to upgrade the game visuals. The renderer runs entirely on
**procedural placeholders** today, so nothing breaks if these folders are empty —
adding files just makes it prettier.

## Folders

```
assets/
├── manifest.json     # index the renderer reads (see below)
├── models/           # .glb / .gltf 3D models (draco/meshopt compressed)
└── audio/            # narration .mp3, music beds, SFX
```

## How to add a model

1. Export/download a **GLB** (CC-licensed from Sketchfab, or generated with
   Meshy.ai / Tripo). Compress it: `npx gltf-transform optimize in.glb out.glb`.
2. Put it in `models/` (e.g. `models/dna_helix.glb`).
3. Set its `file` field in `manifest.json` (e.g. `"file": "models/dna_helix.glb"`).
4. That's it — wiring the loader to swap the placeholder is a one-line `useGLTF`
   in the matching component (marked with `// Placeholder for now` comments).

## Priority upgrades (biggest visual win first)

| id             | what it replaces                    | where to source                |
|----------------|-------------------------------------|--------------------------------|
| `dna_helix`    | procedural helix                    | Sketchfab CC "DNA double helix"|
| `rna_polymerase`| glowing icosahedron blob           | Sketchfab CC enzyme / Meshy    |
| `nucleus_interior` | translucent sphere + motes       | Meshy.ai nuclear envelope      |

Keep everything textbook-recognizable — the mitochondria/DNA must look like the
diagram, not an abstract blob (CLAUDE.md §7 visual bar).
```
```
