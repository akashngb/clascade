import * as THREE from 'three';
import { instance } from './AssetLoader.js';

// World builders. Everything here is primitives + lighting + fog + color
// grade — the spec's bet that good lighting beats bad models. Each builder
// adds a self-contained group (with its own lights) to the scene and returns
// handles + a dispose() so phases can swap environments cleanly. Builders may
// also return update(dt) for ambient life (crowd sway, water, flags).
//
// Street geography (loosely historical): the Appel Quay runs down -Z with
// the Miljacka river on its +X side. The Latin Bridge crosses the river at
// z = -10, and Franz Josef Street branches -X at the same junction — the
// corner where the driver's wrong turn stopped the car in front of
// Schiller's delicatessen.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function disposeGroup(scene, group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
  scene.remove(group);
}

// Canvas label sprite (for map nations, signage).
function makeLabel(text, { color = '#f4efe6', size = 44, sub = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `500 ${size}px Marcellus, Georgia, serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, 256, sub ? 58 : 80);
  if (sub) {
    ctx.font = '500 26px Archivo, sans-serif';
    ctx.fillStyle = 'rgba(200,164,92,0.95)';
    ctx.fillText(sub, 256, 112);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(8, 2.5, 1);
  return sprite;
}

// Runtime noise canvas — used as a cheap water bump map.
function noiseTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.random() * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------------------------------------------------------------------
// Sarajevo street (phases 1–4)
// ---------------------------------------------------------------------------
export function buildStreet(scene, assets = { models: {} }) {
  const models = assets?.models || {};
  const textures = assets?.textures || {};
  const group = new THREE.Group();
  const animated = []; // { obj, fn(t, dt) } ambient animations

  // --- Light: low morning sun rising across the river (east, +X). ---
  const hemi = new THREE.HemisphereLight(0xffe6c4, 0x241a12, 0.5);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd39a, 1.7);
  sun.position.set(32, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 140;
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.bias = -0.0004;
  group.add(sun);
  const fill = new THREE.DirectionalLight(0x91b4d6, 0.28);
  fill.position.set(-20, 14, -10);
  group.add(fill);

  // --- Ground plane (under everything, kills gaps). ---
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6a6055, roughness: 0.95 });
  if (textures.cobblestone) {
    const t = textures.cobblestone.clone();
    t.needsUpdate = true; t.repeat.set(12, 18);
    groundMat.map = t; groundMat.color.set(0x8a8378);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 180), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-10, -0.02, -30);
  ground.receiveShadow = true;
  group.add(ground);

  // --- Quay roadway (tight cobble tiling) + Franz Josef Street branch. ---
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x554e46, roughness: 1 });
  if (textures.cobblestone) {
    const t = textures.cobblestone.clone();
    t.needsUpdate = true; t.repeat.set(2, 30);
    roadMat.map = t; roadMat.color.set(0x9a9186);
  }
  const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 160), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, -35);
  road.receiveShadow = true;
  group.add(road);

  const sideMat = roadMat.clone();
  if (roadMat.map) { sideMat.map = roadMat.map.clone(); sideMat.map.needsUpdate = true; sideMat.map.repeat.set(7, 1.6); }
  const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(36, 8), sideMat);
  sideRoad.rotation.x = -Math.PI / 2;
  sideRoad.position.set(-23, 0.02, -10);
  sideRoad.receiveShadow = true;
  group.add(sideRoad);

  // --- The Miljacka: embankment wall, river, far bank. ---
  const stone = new THREE.MeshStandardMaterial({ color: 0x847b6c, roughness: 0.9 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x6e665a, roughness: 0.95 });

  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 160), stone);
  wall.position.set(7, -0.3, -35);
  wall.castShadow = true; wall.receiveShadow = true;
  group.add(wall);
  // Parapet coping + posts
  const coping = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 160), stoneDark);
  coping.position.set(7, 1.1, -35);
  group.add(coping);
  for (let z = 20; z >= -90; z -= 7) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), stoneDark);
    post.position.set(7, 1.45, z);
    group.add(post);
  }

  const waterBump = noiseTexture();
  waterBump.repeat.set(6, 24);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 170),
    new THREE.MeshPhongMaterial({
      color: 0x2a3a38, shininess: 140, specular: 0x9a8a66,
      bumpMap: waterBump, bumpScale: 0.12,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(21.5, -1.15, -35);
  group.add(water);
  animated.push({ fn: (t, dt) => { waterBump.offset.y -= dt * 0.045; waterBump.offset.x = Math.sin(t * 0.25) * 0.02; } });

  // Far bank: dim silhouettes across the water, softened by fog.
  const farMat = new THREE.MeshStandardMaterial({ color: 0x5a4d3d, roughness: 1 });
  for (let z = 8; z >= -80; z -= rand(8, 12)) {
    const w = rand(6, 10), h = rand(7, 15);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, rand(6, 9)), farMat);
    b.position.set(rand(38, 44), h / 2 - 1, z);
    group.add(b);
  }

  // --- Latin Bridge, crossing at the junction (z = -10). ---
  const bridge = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 0.7, 6), stone);
  deck.position.set(0, 0.55, 0); deck.castShadow = true;
  bridge.add(deck);
  for (const zs of [-2.9, 2.9]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(30, 1.0, 0.35), stoneDark);
    rail.position.set(0, 1.4, zs);
    bridge.add(rail);
  }
  // Piers + arch shadows (dark half-cylinders read as openings from the quay)
  for (const xs of [-8, 0, 8]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 6.4), stone);
    pier.position.set(xs, -0.9, 0);
    bridge.add(pier);
  }
  const archMat = new THREE.MeshBasicMaterial({ color: 0x141210 });
  for (const xs of [-4, 4, 12]) {
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 6.6, 20, 1, false, 0, Math.PI), archMat);
    arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2;
    arch.position.set(xs, -1.05, 0);
    bridge.add(arch);
  }
  bridge.position.set(22, 0, -10);
  group.add(bridge);

  // --- Buildings. Windows are gathered into two InstancedMeshes (lit/unlit).
  const facadeColors = [0x8a6f4e, 0x9a5a4a, 0xb59b74, 0x7d6b52, 0xa8895f, 0x6f5a44, 0x93705a];
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4e4235, roughness: 0.9 });
  const winGeom = new THREE.BoxGeometry(0.9, 1.4, 0.14);
  const litWins = [];   // matrices
  const unlitWins = [];
  const tmpObj = new THREE.Object3D();

  // face: 'x+' (faces +X), 'z-' (faces -Z), 'z+' (faces +Z)
  const addBuilding = (x, z, face, opts = {}) => {
    const w = opts.w ?? rand(5.5, 7.5), d = opts.d ?? rand(5, 7), h = opts.h ?? rand(9, 20);
    const mat = new THREE.MeshStandardMaterial({ color: opts.color ?? pick(facadeColors), roughness: 0.85 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, z);
    b.castShadow = true; b.receiveShadow = true;
    group.add(b);

    // Cornice + occasional pyramid roof
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.35, d + 0.5), trimMat);
    cornice.position.set(x, h + 0.15, z);
    group.add(cornice);
    if (Math.random() < 0.45) {
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(0, Math.max(w, d) * 0.72, rand(1.6, 3), 4),
        new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 0.95 })
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(x, h + 0.3 + roof.geometry.parameters.height / 2, z);
      roof.castShadow = true;
      group.add(roof);
    }

    // Windows on the street face
    const rows = Math.min(5, Math.floor((h - 3) / 3.1));
    const across = face === 'x+' ? d : w;
    const cols = across > 6 ? 3 : 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.18) continue;
        const off = (c - (cols - 1) / 2) * (across / (cols + 0.4));
        const y = 3.6 + r * 3.1;
        if (y > h - 1.5) continue;
        if (face === 'x+') {
          tmpObj.position.set(x + w / 2 + 0.02, y, z + off);
          tmpObj.rotation.set(0, Math.PI / 2, 0);
        } else if (face === 'z-') {
          tmpObj.position.set(x + off, y, z - d / 2 - 0.02);
          tmpObj.rotation.set(0, Math.PI, 0);
        } else {
          tmpObj.position.set(x + off, y, z + d / 2 + 0.02);
          tmpObj.rotation.set(0, 0, 0);
        }
        tmpObj.updateMatrix();
        (Math.random() < 0.4 ? litWins : unlitWins).push(tmpObj.matrix.clone());
      }
    }

    // Ground-floor storefront strip + awning on some quay buildings
    if (opts.shop) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, d * 0.9), new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.9 }));
      strip.position.set(x + w / 2 + 0.05, 1.3, z);
      group.add(strip);
      const awn = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, d * 0.8),
        new THREE.MeshStandardMaterial({ color: opts.awning ?? 0x7a4a3a, roughness: 0.9, side: THREE.DoubleSide })
      );
      awn.rotation.z = -Math.PI / 2 + 0.5;
      awn.rotation.y = Math.PI / 2;
      awn.position.set(x + w / 2 + 0.9, 2.9, z);
      awn.castShadow = true;
      group.add(awn);
    }
    return b;
  };

  // Quay row (-X side), leaving the Franz Josef Street mouth open (z -15..-5)
  for (let z = 16; z >= -70; z -= 7.6) {
    if (z < -4 && z > -16.5) continue;
    addBuilding(-10.5, z, 'x+', { shop: Math.random() < 0.4 });
  }
  // Franz Josef Street rows
  for (let x = -14; x >= -42; x -= 7.6) {
    addBuilding(x, -2.2, 'z-', { d: rand(5, 6) });
    addBuilding(x, -17.8, 'z+', { d: rand(5, 6) });
  }

  // Schiller's delicatessen — the corner the car stops in front of.
  const schiller = addBuilding(-10.5, -18.6, 'x+', {
    color: 0xb08d5e, h: 11, w: 6.5, d: 6.5, shop: true, awning: 0x5c3a2e,
  });
  const sign = makeLabel('SCHILLER', { color: '#e9dfc6', size: 58 });
  sign.scale.set(4.6, 1.35, 1);
  sign.position.set(-6.9, 4.3, -16.2);
  group.add(sign);

  // --- Lamp posts + imperial bunting strung across the quay. ---
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x20201c, roughness: 0.7, metalness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffcf7a, emissiveIntensity: 1.4 });
  const lampZs = [];
  for (let z = 12; z >= -58; z -= 12) {
    lampZs.push(z);
    for (const sx of [-5.6, 5.8]) {
      const lampModel = instance(models, 'lamp');
      if (lampModel) {
        lampModel.position.set(sx, 0, z);
        group.add(lampModel);
      } else {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 8), lampMat);
        post.position.set(sx, 2.5, z); post.castShadow = true;
        group.add(post);
      }
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), glowMat);
      bulb.position.set(sx, 5.0, z);
      group.add(bulb);
    }
  }

  // Bunting: catenary strings of pennants between each lamp pair. The street
  // is decorated for the visit — the narration says so.
  const flagColors = [0xd8a83c, 0x9c3232, 0xe8e0d0];
  const flagGeom = new THREE.PlaneGeometry(0.55, 0.7);
  const stringMat = new THREE.LineBasicMaterial({ color: 0x2a2422, transparent: true, opacity: 0.7 });
  const flags = [];
  for (const z of lampZs) {
    if (z < -14 && z > -22) continue; // keep the bridge sightline clear
    const a = new THREE.Vector3(-5.6, 4.9, z);
    const b = new THREE.Vector3(5.8, 4.9, z);
    const mid = a.clone().lerp(b, 0.5); mid.y = 4.1;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)), stringMat
    ));
    for (let i = 1; i <= 9; i++) {
      const p = curve.getPoint(i / 10);
      const f = new THREE.Mesh(flagGeom, new THREE.MeshStandardMaterial({
        color: flagColors[i % 3], roughness: 0.9, side: THREE.DoubleSide,
      }));
      f.position.set(p.x, p.y - 0.38, p.z);
      f.userData.phase = Math.random() * Math.PI * 2;
      group.add(f);
      flags.push(f);
    }
  }
  animated.push({
    fn: (t) => {
      for (const f of flags) f.rotation.y = Math.sin(t * 1.6 + f.userData.phase) * 0.35;
    },
  });

  // Vertical imperial banners on a few quay facades
  const bannerGeom = new THREE.PlaneGeometry(1.1, 4.2);
  for (const z of [8, -26, -40]) {
    const stripe = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas'); c.width = 32; c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = '#1c1a17'; g.fillRect(0, 0, 32, 64);
      g.fillStyle = '#c8963c'; g.fillRect(0, 64, 32, 64);
      return c;
    })());
    stripe.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(bannerGeom, new THREE.MeshStandardMaterial({
      map: stripe, roughness: 0.9, side: THREE.DoubleSide,
    }));
    banner.rotation.y = Math.PI / 2;
    banner.position.set(-7.1, 6.5, z);
    banner.userData.phase = rand(0, 6);
    group.add(banner);
    flags.push(banner); // same sway pool, reads as wind
  }

  // Window instancing (two draw calls for every window in the scene)
  const unlitMat = new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 0.6 });
  const litMat = new THREE.MeshStandardMaterial({
    color: 0x1a1712, emissive: 0xffd98a, emissiveIntensity: 0.5, roughness: 0.6,
  });
  const mkInstanced = (matrices, mat) => {
    if (!matrices.length) return;
    const im = new THREE.InstancedMesh(winGeom, mat, matrices.length);
    matrices.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  };
  mkInstanced(unlitWins, unlitMat);
  mkInstanced(litWins, litMat);

  // --- Street props (GLB clones where available). ---
  const scatter = [
    ['tree', [-6.6, 4], 0], ['tree', [-6.4, -30], 2.4], ['tree', [5.9, -34], 1.2],
    ['bench', [6.1, -4], Math.PI], ['bench', [6.1, -28], Math.PI], ['bench', [-6.3, -24], 0],
    ['barrel', [-6.9, -1], 0], ['barrel', [-14.5, -6.6], 0],
    ['crate', [-6.7, -22.4], 0.5], ['crate', [-7.0, -23.1], -0.3],
  ];
  for (const [slot, [x, z], ry] of scatter) {
    const m = instance(models, slot);
    if (m) { m.position.set(x, 0, z); m.rotation.y = ry; group.add(m); }
  }

  // --- Newspaper stand (phase-2 objective target). ---
  const stand = new THREE.Group();
  const kioskBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.2, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x5c3d2a, roughness: 0.8 })
  );
  kioskBase.position.y = 1.1; kioskBase.castShadow = true;
  stand.add(kioskBase);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.25, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x7a2f2f, roughness: 0.7 })
  );
  roof.position.y = 2.35; stand.add(roof);
  const papers = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.9, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xe8e0cd, roughness: 0.9 })
  );
  papers.position.set(0, 1.3, 0.75); stand.add(papers);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.08, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xe8b04b, emissive: 0xe8b04b, emissiveIntensity: 1.2 })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; stand.add(ring);
  const standLight = new THREE.PointLight(0xffd98a, 8, 10, 2);
  standLight.position.set(0, 3.2, 0); stand.add(standLight);
  stand.position.set(4.8, 0, -2);
  group.add(stand);
  animated.push({ fn: (t) => { ring.material.emissiveIntensity = 0.9 + Math.sin(t * 2.4) * 0.4; } });

  // --- The motorcade car (actor). ---
  const car = instance(models, 'car') || buildCar();
  car.position.set(-1.8, 0, -55);
  car.rotation.y = Math.PI;
  group.add(car);

  // --- Crowd lining the quay, densest near the fatal corner. ---
  const crowd = buildCrowd(models, animated);
  group.add(crowd);

  scene.add(group);

  let time = 0;
  return {
    group,
    focal: new THREE.Vector3(0, 0, -12),
    forward: new THREE.Vector3(0, 0, -1),
    car,
    crowd,
    newspaperStand: stand,
    ring,
    // The wrong turn: south along the quay, brake, then right into Franz
    // Josef Street and a dead stop in front of Schiller's.
    wrongTurn: {
      path: [
        new THREE.Vector3(-1.8, 0, 22),
        new THREE.Vector3(-1.8, 0, -2),
        new THREE.Vector3(-2.6, 0, -6.5),
        new THREE.Vector3(-5.4, 0, -9),
        new THREE.Vector3(-8.6, 0, -10),
      ],
      stop: new THREE.Vector3(-8.6, 0, -10),
      stopYaw: -Math.PI / 2 - 0.18,
    },
    fpBounds: { minX: -6.6, maxX: 6.2, minZ: -52, maxZ: 14 },
    background: textures.sky || new THREE.Color(0x0a0908),
    fog: textures.sky ? { color: 0x9c8a6d, density: 0.0085 } : { color: 0x0a0908, density: 0.011 },
    update: (dt) => {
      time += dt;
      for (const a of animated) a.fn(time, dt);
    },
    dispose: () => disposeGroup(scene, group),
  };
}

// Stylized 1911 open touring car from primitives.
function buildCar() {
  const car = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x1f2d24, roughness: 0.5, metalness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6, metalness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xcaa24a, roughness: 0.4, metalness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 1.9), green);
  body.position.y = 1.0; body.castShadow = true; car.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.7), green);
  hood.position.set(1.5, 1.15, 0); hood.castShadow = true; car.add(hood);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.15), green);
  sideL.position.set(-0.6, 1.5, 0.9); car.add(sideL);
  const sideR = sideL.clone(); sideR.position.z = -0.9; car.add(sideR);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.5), black);
  seat.position.set(-0.9, 1.45, 0); car.add(seat);
  for (const [x, z] of [[1.4, 0.95], [1.4, -0.95], [-1.4, 0.95], [-1.4, -0.95]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.35), black);
    f.position.set(x, 0.75, z); car.add(f);
  }
  for (const [x, z] of [[1.35, 1.05], [1.35, -1.05], [-1.35, 1.05], [-1.35, -1.05]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 16), black);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, z); w.castShadow = true; car.add(w);
  }
  for (const z of [0.6, -0.6]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), brass);
    l.position.set(2.35, 1.1, z); car.add(l);
  }
  return car;
}

// Crowd lining the quay. Uses person GLBs when available, else a hatted
// primitive figure (1914: everyone wears a hat). Figures sway gently.
function buildCrowd(models = {}, animated = []) {
  const crowd = new THREE.Group();
  const personSlots = ['person1', 'person2', 'person3'].filter((s) => models[s]);
  const clothes = [0x6b5d52, 0x4a4a55, 0x7a5a4a, 0x565c50, 0x8a7a66, 0x3f3a34];
  const skin = new THREE.MeshStandardMaterial({ color: 0xcaa98a, roughness: 0.8 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: 0.9 });

  const primitiveFigure = () => {
    const fig = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: pick(clothes), roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 4, 8), bodyMat);
    body.position.y = 0.85; body.castShadow = true; fig.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skin);
    head.position.y = 1.55; fig.add(head);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 12), hatMat);
    brim.position.y = 1.68; fig.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.22, 12), hatMat);
    top.position.y = 1.8; fig.add(top);
    return fig;
  };

  const figs = [];
  const place = (x, z, faceYaw) => {
    const fig = personSlots.length ? instance(models, pick(personSlots)) : primitiveFigure();
    if (!fig) return;
    fig.position.set(x, 0, z);
    fig.rotation.y = faceYaw + rand(-0.5, 0.5);
    fig.scale.multiplyScalar(rand(0.92, 1.08));
    fig.userData.phase = rand(0, Math.PI * 2);
    fig.userData.baseY = 0;
    crowd.add(fig);
    figs.push(fig);
  };

  // Quay sidewalk (-X side), skipping the side-street mouth
  for (let i = 0; i < 16; i++) {
    const z = rand(-48, 12);
    if (z < -4 && z > -16) continue;
    place(rand(-7.2, -5.6), z, Math.PI / 2);
  }
  // Embankment walk (+X side)
  for (let i = 0; i < 12; i++) place(rand(5.3, 6.4), rand(-46, 10), -Math.PI / 2);
  // Dense knot at the fatal corner — the crowd phase 4 pushes through
  for (let i = 0; i < 10; i++) place(rand(-8.5, -4.5), rand(-16, -5), rand(0, Math.PI * 2));

  animated.push({
    fn: (t) => {
      for (const f of figs) {
        f.position.y = Math.sin(t * 1.4 + f.userData.phase) * 0.025;
        f.rotation.y += Math.sin(t * 0.6 + f.userData.phase) * 0.0006;
      }
    },
  });
  return crowd;
}

// ---------------------------------------------------------------------------
// Alliance map (phase 5) — nations as glowing pillars on a dark table.
// ---------------------------------------------------------------------------
export function buildAllianceMap(scene) {
  const group = new THREE.Group();

  const hemi = new THREE.HemisphereLight(0x6a7ea0, 0x0a0a0f, 1.0);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xdfe8ff, 1.2);
  key.position.set(10, 20, 12); group.add(key);

  const table = new THREE.Mesh(
    new THREE.CircleGeometry(26, 48),
    new THREE.MeshStandardMaterial({ color: 0x232a38, roughness: 0.9 })
  );
  table.rotation.x = -Math.PI / 2; group.add(table);

  const nations = [
    { id: 'austria-hungary', name: 'Austria-Hungary', color: 0xd98a4b, angle: Math.PI * 0.5,
      note: 'Blamed Serbia for the assassination and declared war first.' },
    { id: 'serbia', name: 'Serbia', color: 0xc0504d, angle: Math.PI * 0.9,
      note: 'Home of the nationalist cause; refused all of Austria-Hungary’s demands.' },
    { id: 'russia', name: 'Russia', color: 0x8a6fd9, angle: Math.PI * 1.25,
      note: 'Pledged to defend Serbia and began mobilising its army.' },
    { id: 'germany', name: 'Germany', color: 0x6b7280, angle: Math.PI * 0.15,
      note: 'Backed Austria-Hungary with a “blank cheque” and declared war on Russia and France.' },
    { id: 'france', name: 'France', color: 0x4b74d9, angle: Math.PI * 1.6,
      note: 'Allied to Russia — pulled in against Germany.' },
    { id: 'britain', name: 'Britain', color: 0x4fb0a0, angle: Math.PI * 1.9,
      note: 'Entered when Germany invaded neutral Belgium.' },
  ];

  const nodes = [];
  const R = 16;
  nations.forEach((n) => {
    const x = Math.cos(n.angle) * R, z = Math.sin(n.angle) * R;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 3, 24),
      new THREE.MeshStandardMaterial({ color: n.color, emissive: n.color, emissiveIntensity: 0.85, roughness: 0.5 })
    );
    pillar.position.set(x, 1.5, z); pillar.castShadow = true;
    pillar.userData = { ...n, examined: false };
    group.add(pillar);
    const label = makeLabel(n.name);
    label.position.set(x, 4.2, z);
    group.add(label);
    nodes.push(pillar);
  });

  const links = [
    ['austria-hungary', 'germany'], ['austria-hungary', 'serbia'],
    ['serbia', 'russia'], ['russia', 'france'], ['germany', 'russia'],
    ['germany', 'france'], ['france', 'britain'],
  ];
  const posOf = (id) => nodes.find((p) => p.userData.id === id).position;
  const lineMat = new THREE.LineBasicMaterial({ color: 0x55606f, transparent: true, opacity: 0.5 });
  links.forEach(([a, b]) => {
    const g = new THREE.BufferGeometry().setFromPoints([
      posOf(a).clone().setY(1.5), posOf(b).clone().setY(1.5),
    ]);
    group.add(new THREE.Line(g, lineMat));
  });

  scene.add(group);
  return {
    group,
    focal: new THREE.Vector3(0, 1, 0),
    forward: new THREE.Vector3(0, 0, -1),
    nodes,
    orbitRadius: 30,
    orbitHeight: 20,
    background: new THREE.Color(0x0d1018),
    fog: { color: 0x0d1018, density: 0.006 },
    dispose: () => disposeGroup(scene, group),
  };
}

// ---------------------------------------------------------------------------
// Quiz room (phase 6) — a calm lit platform behind the DOM quiz overlay.
// ---------------------------------------------------------------------------
export function buildQuizRoom(scene) {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0x4a4436, 0x0a0908, 0.7);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xffe6c4, 0.9);
  key.position.set(6, 14, 8); key.castShadow = true; group.add(key);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 8.4, 0.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.8 })
  );
  platform.position.y = -0.3; platform.receiveShadow = true; group.add(platform);

  const rings = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(3 + i * 1.6, 0.05, 8, 60),
      new THREE.MeshStandardMaterial({ color: 0xe8b04b, emissive: 0xe8b04b, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 })
    );
    r.rotation.x = -Math.PI / 2; r.position.y = 1 + i * 0.4; rings.add(r);
  }
  group.add(rings);

  scene.add(group);
  return {
    group,
    focal: new THREE.Vector3(0, 2, 0),
    forward: new THREE.Vector3(0, 0, -1),
    rings,
    background: new THREE.Color(0x0a0908),
    fog: { color: 0x0a0908, density: 0.02 },
    dispose: () => disposeGroup(scene, group),
  };
}
