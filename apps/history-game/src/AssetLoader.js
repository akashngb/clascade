import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// "Shops" the asset manifest before falling back to primitives (spec §8).
// Loads CC-licensed GLBs, normalizes each to a target size with feet on the
// ground and centered, and enables shadows. Models come from arbitrary
// creators at arbitrary scales/orientations, so normalization is essential.

// Target max-dimension (metres) + optional yaw correction per slot.
const SLOT_CONFIG = {
  // The Old Car GLB's nose is offset ~80° right of +Z; counter-rotate so it
  // faces its direction of travel.
  car: { size: 4.6, yaw: (80 * Math.PI) / 180 },
  lamp: { size: 5.2, yaw: 0 },
  bench: { size: 1.8, yaw: 0 },
  tree: { size: 6.5, yaw: 0 },
  barrel: { size: 1.1, yaw: 0 },
  crate: { size: 1.0, yaw: 0 },
  person1: { size: 1.75, yaw: 0 },
  person2: { size: 1.8, yaw: 0 },
  person3: { size: 1.7, yaw: 0 },
};

function normalize(scene, targetSize, yaw = 0) {
  const wrapper = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(scene);
  wrapper.add(inner);

  let box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  scene.scale.setScalar(scale);

  box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= box.min.y; // feet on ground

  inner.rotation.y = yaw;

  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material && 'roughness' in o.material && o.material.roughness === undefined) {
        o.material.roughness = 0.8;
      }
    }
  });
  return wrapper;
}

export async function loadAssets(manifestUrl = '/assets/manifest.json') {
  const loader = new GLTFLoader();
  const models = {};
  const credits = [];

  let manifest;
  try {
    manifest = await fetch(manifestUrl).then((r) => (r.ok ? r.json() : null));
  } catch {
    manifest = null;
  }
  if (!manifest?.models) {
    console.warn('[assets] no manifest — using primitive fallbacks');
    return { models, credits };
  }

  const entries = Object.entries(manifest.models);
  await Promise.all(
    entries.map(async ([slot, meta]) => {
      try {
        const gltf = await loader.loadAsync('/' + meta.file.replace(/^\//, ''));
        const cfg = SLOT_CONFIG[slot] || { size: 2, yaw: 0 };
        models[slot] = normalize(gltf.scene, cfg.size, cfg.yaw);
        if (meta.attribution) credits.push(meta.attribution);
        console.log(`[assets] loaded "${slot}" (${meta.title})`);
      } catch (e) {
        console.warn(`[assets] failed "${slot}": ${e.message} — primitive fallback`);
      }
    })
  );

  const textures = await loadTextures();

  window.__assetCredits = credits;
  return { models, credits, textures };
}

// Load generated textures (sky backdrop, cobblestone ground).
async function loadTextures() {
  const textures = {};
  let man;
  try {
    man = await fetch('/assets/textures-manifest.json').then((r) => (r.ok ? r.json() : null));
  } catch { man = null; }
  if (!man?.textures) return textures;

  const tl = new THREE.TextureLoader();
  await Promise.all(
    Object.entries(man.textures).map(async ([slot, file]) => {
      try {
        const tex = await tl.loadAsync('/' + file.replace(/^\//, ''));
        tex.colorSpace = THREE.SRGBColorSpace;
        if (slot === 'cobblestone' || slot === 'ground') {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.anisotropy = 4;
        }
        textures[slot] = tex;
        console.log(`[assets] texture "${slot}"`);
      } catch (e) {
        console.warn(`[assets] texture "${slot}" failed: ${e.message}`);
      }
    })
  );
  return textures;
}

// Clone a loaded template for placement. Returns null if the slot is missing
// so callers can fall back to a primitive.
export function instance(models, slot) {
  const tpl = models[slot];
  return tpl ? tpl.clone(true) : null;
}
