import * as THREE from 'three';
import { instance } from './AssetLoader.js';

// Grey-box world builders. Everything here is primitives + lighting + fog +
// color grade — the spec's bet that good lighting beats bad models. Each
// builder adds a self-contained group (with its own lights) to the scene and
// returns handles + a dispose() so phases can swap environments cleanly.

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
function makeLabel(text, color = '#f4efe6', size = 44) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${size}px -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(8, 2, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Sarajevo street (phases 1–4)
// Street runs down the -Z axis; buildings line x = ±8.
// ---------------------------------------------------------------------------
export function buildStreet(scene, assets = { models: {} }) {
  const models = assets?.models || {};
  const group = new THREE.Group();

  // Lights — low warm morning sun with long shadows.
  const hemi = new THREE.HemisphereLight(0xffe6c4, 0x241a12, 0.55);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd39a, 1.6);
  sun.position.set(-28, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
  sun.shadow.bias = -0.0004;
  group.add(sun);
  const fill = new THREE.DirectionalLight(0x91b4d6, 0.3);
  fill.position.set(20, 12, -10);
  group.add(fill);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 160),
    new THREE.MeshStandardMaterial({ color: 0x554b41, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -30;
  ground.receiveShadow = true;
  group.add(ground);

  // Cobbled roadway strip (slightly different tone)
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 150),
    new THREE.MeshStandardMaterial({ color: 0x48413a, roughness: 1 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -30);
  road.receiveShadow = true;
  group.add(road);

  // Buildings both sides
  const facadeColors = [0x8a6f4e, 0x9a5a4a, 0xb59b74, 0x7d6b52, 0xa8895f, 0x6f5a44];
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x1a1712, emissive: 0xffd98a, emissiveIntensity: 0.35, roughness: 0.6,
  });
  const addBuilding = (x, z, faceX) => {
    const w = rand(5, 7), d = rand(5, 7), h = rand(9, 22);
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: pick(facadeColors), roughness: 0.85 })
    );
    b.position.set(x, h / 2, z);
    b.castShadow = true; b.receiveShadow = true;
    group.add(b);
    // A few lit windows facing the street
    const rows = Math.min(4, Math.floor(h / 4));
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c <= 1; c++) {
        if (Math.random() < 0.45) continue;
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.15), winMat);
        win.position.set(x + faceX * (w / 2 + 0.05), 2.5 + r * 3.2, z + c * 1.7);
        group.add(win);
      }
    }
  };
  for (let z = 12; z >= -58; z -= 7.2) {
    addBuilding(-9 + rand(-0.6, 0.6), z, -1);
    addBuilding(9 + rand(-0.6, 0.6), z, 1);
  }

  // Lamp posts — real GLB if available, else primitive; warm bulb either way.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x20201c, roughness: 0.7, metalness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffcf7a, emissiveIntensity: 1.4 });
  for (let z = 8; z >= -54; z -= 12) {
    for (const sx of [-5.4, 5.4]) {
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

  // Scattered street props (benches, trees, barrels, crates) — clones of GLBs.
  const scatter = [
    ['tree', [-5.8, -3], 0], ['tree', [5.8, -20], 1.2], ['tree', [-6.0, -34], 2.4],
    ['bench', [5.3, -2], -Math.PI / 2], ['bench', [-5.3, -16], Math.PI / 2],
    ['barrel', [5.7, -9], 0], ['barrel', [-5.8, -26], 0],
    ['crate', [5.6, -13], 0.5], ['crate', [5.9, -13.7], -0.3],
  ];
  for (const [slot, [x, z], ry] of scatter) {
    const m = instance(models, slot);
    if (m) { m.position.set(x, 0, z); m.rotation.y = ry; group.add(m); }
  }

  // Newspaper stand (phase-2 objective target) at (5, 0, -6)
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
  // Attention ring on the ground
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.08, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0xe8b04b, emissive: 0xe8b04b, emissiveIntensity: 1.2 })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; stand.add(ring);
  const standLight = new THREE.PointLight(0xffd98a, 8, 10, 2);
  standLight.position.set(0, 3.2, 0); stand.add(standLight);
  stand.position.set(5, 0, -6);
  group.add(stand);

  // The motorcade car (actor) — the recognizability-critical GLB, else primitive.
  const car = instance(models, 'car') || buildCar();
  car.position.set(0, 0, -45);
  car.rotation.y = Math.PI;
  group.add(car);

  // Crowd lining the sidewalks
  const crowd = buildCrowd(26, models);
  group.add(crowd);

  scene.add(group);

  return {
    group,
    focal: new THREE.Vector3(0, 0, -12),
    forward: new THREE.Vector3(0, 0, -1),
    car,
    crowd,
    newspaperStand: stand,
    ring,
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
  // Open cabin sides
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.15), green);
  sideL.position.set(-0.6, 1.5, 0.9); car.add(sideL);
  const sideR = sideL.clone(); sideR.position.z = -0.9; car.add(sideR);
  // Seats
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.5), black);
  seat.position.set(-0.9, 1.45, 0); car.add(seat);
  // Fenders
  for (const [x, z] of [[1.4, 0.95], [1.4, -0.95], [-1.4, 0.95], [-1.4, -0.95]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.35), black);
    f.position.set(x, 0.75, z); car.add(f);
  }
  // Wheels
  for (const [x, z] of [[1.35, 1.05], [1.35, -1.05], [-1.35, 1.05], [-1.35, -1.05]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 16), black);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, z); w.castShadow = true; car.add(w);
  }
  // Brass headlamps
  for (const z of [0.6, -0.6]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), brass);
    l.position.set(2.35, 1.1, z); car.add(l);
  }
  return car;
}

// Crowd lining both sidewalks. Uses person GLBs when available (randomly
// picking among the loaded variants), else a capsule+sphere figure.
function buildCrowd(count, models = {}) {
  const crowd = new THREE.Group();
  const personSlots = ['person1', 'person2', 'person3'].filter((s) => models[s]);
  const clothes = [0x6b5d52, 0x4a4a55, 0x7a5a4a, 0x565c50, 0x8a7a66, 0x3f3a34];
  const skin = new THREE.MeshStandardMaterial({ color: 0xcaa98a, roughness: 0.8 });

  const primitiveFigure = () => {
    const fig = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: pick(clothes), roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 4, 8), bodyMat);
    body.position.y = 0.85; body.castShadow = true; fig.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skin);
    head.position.y = 1.55; fig.add(head);
    return fig;
  };

  for (let i = 0; i < count; i++) {
    const fig = personSlots.length ? instance(models, pick(personSlots)) : primitiveFigure();
    if (!fig) continue;
    const side = Math.random() < 0.5 ? -1 : 1;
    fig.position.set(side * rand(3.8, 5.2), 0, rand(-50, 8));
    // Face roughly toward the roadway, with some natural variation.
    fig.rotation.y = rand(-0.6, 0.6) + (side < 0 ? Math.PI / 2 : -Math.PI / 2);
    fig.scale.multiplyScalar(rand(0.92, 1.08));
    crowd.add(fig);
  }
  return crowd;
}

// ---------------------------------------------------------------------------
// Alliance map (phase 5) — nations as glowing pillars on a dark table.
// ---------------------------------------------------------------------------
export function buildAllianceMap(scene) {
  const group = new THREE.Group();

  const hemi = new THREE.HemisphereLight(0x334455, 0x0a0a0f, 0.5);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xdfe8ff, 0.8);
  key.position.set(10, 20, 12); group.add(key);

  const table = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.9 })
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
      new THREE.MeshStandardMaterial({ color: n.color, emissive: n.color, emissiveIntensity: 0.25, roughness: 0.5 })
    );
    pillar.position.set(x, 1.5, z); pillar.castShadow = true;
    pillar.userData = { ...n, examined: false };
    group.add(pillar);
    const label = makeLabel(n.name);
    label.position.set(x, 4.2, z);
    group.add(label);
    nodes.push(pillar);
  });

  // Alliance connection lines
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
    orbitRadius: 26,
    orbitHeight: 12,
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

  // Slowly rotating accent rings for a little life behind the quiz
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
    dispose: () => disposeGroup(scene, group),
  };
}
