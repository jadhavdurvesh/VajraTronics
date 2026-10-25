import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const DURATION = 12;
const TAU = Math.PI * 2;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0b);
scene.fog = new THREE.FogExp2(0x090b0b, 0.035);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 180);
camera.position.set(0, 2.2, 14);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.querySelector('.scene-wrap').appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.55, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const mat = {
  dark: new THREE.MeshStandardMaterial({ color: 0x171c1a, metalness: 0.9, roughness: 0.26 }),
  mid: new THREE.MeshStandardMaterial({ color: 0x343c38, metalness: 0.82, roughness: 0.32 }),
  silver: new THREE.MeshStandardMaterial({ color: 0x9ca49c, metalness: 0.94, roughness: 0.22 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff5c35, emissive: 0x7a1707, emissiveIntensity: 0.55, metalness: 0.55, roughness: 0.3 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xffb19a, emissive: 0xff3d12, emissiveIntensity: 1.8, roughness: 0.25 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0xb9f6cf, emissive: 0x56e895, emissiveIntensity: 2.5 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x0c0f0e, roughness: 0.86, metalness: 0.15 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xff7650, transparent: true, opacity: 0.18, metalness: 0.2, roughness: 0.15, side: THREE.DoubleSide }),
};

function mesh(geometry, material, parent, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position); item.rotation.set(...rotation);
  item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
}
function box(parent, size, position, material = mat.dark, rotation) { return mesh(new THREE.BoxGeometry(...size), material, parent, position, rotation); }
function cyl(parent, radius, depth, position, material = mat.mid, rotation = [0, 0, 0], segments = 32) { return mesh(new THREE.CylinderGeometry(radius, radius, depth, segments), material, parent, position, rotation); }
function torus(parent, radius, tube, position, material = mat.mid, rotation = [0, 0, 0]) { return mesh(new THREE.TorusGeometry(radius, tube, 12, 96), material, parent, position, rotation); }
function beam(parent, start, end, radius, material = mat.mid) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), delta = b.clone().sub(a);
  const item = cyl(parent, radius, delta.length(), a.clone().add(b).multiplyScalar(0.5).toArray(), material, [0, 0, 0], 12);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return item;
}
function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = seeded(26026);

scene.add(new THREE.HemisphereLight(0xc9ded4, 0x16100c, 1.7));
const key = new THREE.DirectionalLight(0xffe5d4, 5); key.position.set(4, 9, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -10; key.shadow.camera.right = 10; key.shadow.camera.top = 10; key.shadow.camera.bottom = -10; scene.add(key);
const rim = new THREE.DirectionalLight(0x91b9aa, 3.5); rim.position.set(-8, 3, -5); scene.add(rim);
const orangeLight = new THREE.PointLight(0xff4b20, 14, 15, 2); orangeLight.position.set(2, 0, 3); scene.add(orangeLight);

const floor = mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x090b0b, metalness: 0.2, roughness: 0.82 }), scene, [0, -3.25, 0], [-Math.PI / 2, 0, 0]);
floor.castShadow = false;
const grid = new THREE.GridHelper(100, 70, 0x45352e, 0x202624); grid.position.y = -3.22; grid.material.transparent = true; grid.material.opacity = 0.36; scene.add(grid);
const floorRing = torus(scene, 5.1, 0.012, [0, -3.18, 0], mat.orange, [-Math.PI / 2, 0, 0]); floorRing.material = mat.orange.clone(); floorRing.material.transparent = true; floorRing.material.opacity = 0.45;

const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(360 * 3);
for (let i = 0; i < 360; i++) { const r = 8 + rand() * 42, a = rand() * TAU; particlePositions[i * 3] = Math.cos(a) * r; particlePositions[i * 3 + 1] = -2 + rand() * 18; particlePositions[i * 3 + 2] = Math.sin(a) * r - 10; }
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0xb4b9ac, size: 0.025, transparent: true, opacity: 0.55 })); scene.add(particles);

const core = new THREE.Group(); scene.add(core);
const coreSpin = new THREE.Group(); core.add(coreSpin);
mesh(new THREE.IcosahedronGeometry(1.45, 1), mat.dark, coreSpin);
mesh(new THREE.IcosahedronGeometry(1.49, 1), new THREE.MeshBasicMaterial({ color: 0xff7954, wireframe: true, transparent: true, opacity: 0.4 }), coreSpin);
mesh(new THREE.SphereGeometry(0.72, 32, 24), mat.glow, coreSpin);
const cage = mesh(new THREE.OctahedronGeometry(2.05, 0), mat.glass, coreSpin); cage.scale.set(1, 1.35, 1);
const rings = new THREE.Group(); core.add(rings);
[[2.65, .07, [Math.PI / 2.7, .2, .3]], [3.05, .035, [.4, Math.PI / 2.2, 0]], [2.3, .045, [1.2, .8, 1.4]]].forEach(([r, t, rot], i) => { const ring = torus(rings, r, t, [0, 0, 0], i === 1 ? mat.orange : mat.silver, rot); ring.userData.speed = i % 2 ? -1 : 1; });
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU, arm = new THREE.Group(); arm.rotation.z = a; coreSpin.add(arm);
  beam(arm, [1.15, 0, 0], [2.5, 0, 0], .08, mat.silver);
  box(arm, [.55, .3, .65], [2.35, 0, 0], i % 2 ? mat.dark : mat.orange);
  cyl(arm, .11, .42, [2.35, .28, 0], mat.glow, [0, 0, 0], 16);
}
for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; const bolt = box(rings, [.12, .25, .16], [Math.cos(a) * 2.65, Math.sin(a) * 2.65, 0], i % 5 === 0 ? mat.orange : mat.mid); bolt.rotation.z = a; }
const orbitDot = mesh(new THREE.SphereGeometry(.11, 16, 12), mat.cyan, rings, [3.05, 0, 0]);

const machine = new THREE.Group(); scene.add(machine);
box(machine, [5.4, .35, 3.8], [0, -2.55, 0], mat.dark);
box(machine, [4.8, .16, 3.2], [0, -2.32, 0], mat.orange);
for (const x of [-2.25, 2.25]) for (const z of [-1.35, 1.35]) { box(machine, [.22, 4.4, .22], [x, -.1, z], mat.mid); cyl(machine, .17, .35, [x, -2.65, z], mat.rubber); }
box(machine, [4.75, .22, 2.95], [0, 2.1, 0], mat.mid);
box(machine, [4.45, 1.2, .18], [0, 1.35, -1.3], mat.dark);
for (let i = 0; i < 5; i++) box(machine, [.06, .55, .05], [-1.6 + i * .22, 1.38, -1.18], mat.orange);
const rollers = new THREE.Group(); machine.add(rollers);
for (let i = 0; i < 3; i++) {
  const z = -1 + i;
  const roll = cyl(rollers, .68, 3.55, [0, -.85, z], i === 1 ? mat.orange : mat.silver, [0, 0, Math.PI / 2], 48); roll.userData.roller = true;
  for (const x of [-1.95, 1.95]) { cyl(machine, .82, .25, [x, -.85, z], mat.dark, [0, 0, Math.PI / 2]); torus(machine, .53, .055, [x + (x > 0 ? .14 : -.14), -.85, z], mat.orange, [0, Math.PI / 2, 0]); }
}
const consoleGroup = new THREE.Group(); consoleGroup.position.set(2.55, .6, 1); consoleGroup.rotation.y = -.25; machine.add(consoleGroup);
box(consoleGroup, [.3, 2.1, 1.55], [0, 0, 0], mat.dark);
box(consoleGroup, [.02, 1.35, 1.15], [.17, .15, 0], new THREE.MeshStandardMaterial({ color: 0x101a16, emissive: 0x1a5d3d, emissiveIntensity: .5 }));
for (let i = 0; i < 4; i++) box(consoleGroup, [.025, .045, .65 - i * .1], [.185, .55 - i * .22, 0], i === 0 ? mat.orange : mat.cyan);
const beacon = cyl(machine, .14, .45, [1.9, 2.48, 0], mat.glow);
const gauge = torus(machine, .47, .045, [-1.45, 1.32, 1.43], mat.silver); const needle = box(machine, [.04, .38, .04], [-1.45, 1.48, 1.45], mat.orange); needle.geometry.translate(0, -.14, 0);

const robot = new THREE.Group(); scene.add(robot);
for (const x of [-1.45, 1.45]) {
  box(robot, [.72, 1.05, 4.15], [x, -1.75, 0], mat.rubber);
  for (let i = 0; i < 5; i++) { const z = -1.55 + i * .78; cyl(robot, .43, .82, [x, -1.73, z], i === 2 ? mat.orange : mat.mid, [0, 0, Math.PI / 2], 24); cyl(robot, .17, .86, [x, -1.73, z], mat.dark, [0, 0, Math.PI / 2], 16); }
  for (let i = 0; i < 12; i++) box(robot, [.82, .12, .22], [x, -1.15, -1.85 + i * .34], mat.mid);
}
box(robot, [2.5, .55, 3.2], [0, -1.25, 0], mat.dark);
box(robot, [2.65, 1.15, 2.45], [0, -.45, -.15], mat.orange);
box(robot, [2.2, .18, 2.05], [0, .2, -.15], mat.dark);
for (let i = 0; i < 5; i++) box(robot, [1.5, .06, .06], [0, -.18 - i * .17, 1.09], mat.dark);
const tank = cyl(robot, .77, 2.15, [0, 1.15, -.55], mat.silver, [0, 0, 0], 40);
torus(robot, .78, .06, [0, 1.9, -.55], mat.dark, [Math.PI / 2, 0, 0]); torus(robot, .78, .06, [0, .4, -.55], mat.dark, [Math.PI / 2, 0, 0]);
const mast = new THREE.Group(); mast.position.set(0, 2.25, -.4); robot.add(mast);
cyl(mast, .12, 1.1, [0, 0, 0], mat.mid);
box(mast, [1.3, .6, .65], [0, .62, .05], mat.dark);
for (const x of [-.38, .38]) { cyl(mast, .18, .16, [x, .65, .42], mat.glow, [Math.PI / 2, 0, 0], 24); }
const nozzle = new THREE.Group(); nozzle.position.set(0, .25, 1.1); robot.add(nozzle);
cyl(nozzle, .2, 1.4, [0, .55, .35], mat.mid, [Math.PI / 3, 0, 0]); cyl(nozzle, .29, .45, [0, 1.08, .7], mat.orange, [Math.PI / 3, 0, 0]);
for (const x of [-1, 1]) box(robot, [.18, .18, .08], [x, -.35, 1.12], mat.cyan);
beam(robot, [-.8, .2, -.8], [-.8, 2.2, -.8], .055, mat.dark); mesh(new THREE.SphereGeometry(.11, 12, 8), mat.glow, robot, [-.8, 2.28, -.8]);

let stage = 'core', scrollEnergy = 0;
let pointerX = 0, pointerY = 0;
addEventListener('pointermove', e => { pointerX = e.clientX / innerWidth - .5; pointerY = e.clientY / innerHeight - .5; }, { passive: true });
window.setVajraScene = next => { stage = next; };
window.setVajraScroll = value => { scrollEnergy = value; };

function layout(group, visible, x) {
  group.visible = visible;
  const mobile = innerWidth < 600;
  group.position.x = mobile ? 0 : x;
  group.position.y = mobile ? 1.25 : 0;
  group.scale.setScalar(mobile ? .78 : 1);
}
function sample(t) {
  const p = t / DURATION * TAU;
  layout(core, stage === 'core', 2.55); layout(machine, stage === 'machine', 2.6); layout(robot, stage === 'robot', -2.7);
  coreSpin.rotation.set(.12 + Math.sin(p) * .08, p + scrollEnergy * 1.4, Math.cos(p) * .06);
  coreSpin.position.y = Math.sin(p * 2) * .14;
  rings.rotation.y = -p; rings.rotation.x = Math.sin(p) * .12;
  rings.children.forEach((ring, i) => { if (ring.geometry?.type === 'TorusGeometry') ring.rotation.z += 0; });
  orbitDot.position.set(Math.cos(p) * 3.05, Math.sin(p) * 3.05, 0);
  rollers.children.forEach((roll, i) => { roll.rotation.x = p * (i % 2 ? -2 : 2); });
  needle.rotation.z = Math.sin(p * 2) * .6;
  beacon.material.emissiveIntensity = 2.5 + (1 + Math.sin(p * 4)) * 2;
  mast.rotation.y = Math.sin(p) * .65;
  robot.position.y += 0;
  particles.rotation.y = p;
  const mobile = innerWidth < 600;
  camera.position.x = pointerX * (mobile ? .15 : .55);
  camera.position.y = 2.2 - pointerY * .25;
  camera.lookAt(0, mobile ? .4 : 0, 0);
  orangeLight.position.x = stage === 'robot' ? -3 : 3;
}
let usePost = true, qualityFrames = 0, qualityTime = 0, lowFrames = 0, lowTime = 0, lowPower = false;
function draw() { if (usePost) composer.render(); else renderer.render(scene, camera); }
const clock = new THREE.Clock(); let simT = 0, paused = false, acc = 0;
renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta(), dt = Math.min(rawDt, .08);
  if (!paused && !reduceMotion) {
    acc += dt; while (acc >= 1 / 60) { simT += 1 / 60; acc -= 1 / 60; }
    if (usePost && qualityFrames < 30) {
      qualityFrames++; qualityTime += rawDt;
      if (qualityFrames === 30 && qualityFrames / qualityTime < 26) { usePost = false; renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); }
    } else if (!usePost && !lowPower) {
      lowFrames++; lowTime += rawDt;
      if (lowFrames === 30 && lowFrames / lowTime < 26) { lowPower = true; renderer.shadowMap.enabled = false; key.castShadow = false; }
    }
  }
  sample(simT); draw();
});
window.__seek = t => { paused = true; dispatchEvent(new CustomEvent('vajra:seek')); simT = Number.isFinite(Number(t)) ? Number(t) : 0; sample(simT); draw(); };
window.__play = () => { paused = false; clock.getDelta(); };
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); sample(simT); draw(); });
sample(0); draw();
const timeParam = new URLSearchParams(location.search).get('t'); if (timeParam !== null) window.__seek(timeParam);
window.__SCENE_READY__ = true;
