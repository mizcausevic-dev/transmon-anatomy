import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { BARRIER, MAG, METALS, PACKAGE, SUBSTRATE, Z, type Rect } from "./layout";
import { SHOT } from "./model/measurement";
import {
  cameraAt,
  carrierClock,
  controlSnapshot,
  driveRibbon,
  lidOpacity,
  magOpacity,
  readoutRibbons,
  type RibbonState,
} from "./timeline";

const ribbonVert = `
attribute float aAlong;
attribute float aTop;
uniform float uCenter;
uniform float uAmp;
uniform float uLift;
uniform float uSharp;
varying float vFade;
varying float vAlong;
varying float vTop;
void main() {
  float d = aAlong - uCenter;
  float env = exp(-d * d * uSharp);
  vec3 p = position;
  p.z += aTop * env * uAmp * uLift;
  vFade = env * uAmp;
  vAlong = aAlong;
  vTop = aTop;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const ribbonFrag = `
precision highp float;
uniform vec3 uColor;
uniform float uPhase;
uniform float uCarrier;
varying float vFade;
varying float vAlong;
varying float vTop;
void main() {
  float carrier = uCarrier > 0.5 ? (0.78 + 0.22 * sin(vAlong * 40.0 + uPhase)) : 1.0;
  float alpha = vFade * (0.2 + 0.8 * vTop) * carrier;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const cohVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const cohFrag = `
precision highp float;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float band = 0.62 + 0.38 * cos((vUv.x - 0.5) * 9.0);
  gl_FragColor = vec4(0.72, 0.4, 0.95, uAlpha * band);
}
`;

function ribbonGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  const n = points.length;
  const positions = new Float32Array(n * 2 * 3);
  const along = new Float32Array(n * 2);
  const top = new Float32Array(n * 2);
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const a = i * 2;
    positions[a * 3] = p.x;
    positions[a * 3 + 1] = p.y;
    positions[a * 3 + 2] = p.z;
    positions[(a + 1) * 3] = p.x;
    positions[(a + 1) * 3 + 1] = p.y;
    positions[(a + 1) * 3 + 2] = p.z;
    const u = n === 1 ? 0 : i / (n - 1);
    along[a] = u;
    along[a + 1] = u;
    top[a] = 0;
    top[a + 1] = 1;
    if (i < n - 1) {
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
  geo.setAttribute("aTop", new THREE.BufferAttribute(top, 1));
  geo.setIndex(indices);
  return geo;
}

function linePoints(samples: [number, number, number][]): THREE.Vector3[] {
  return samples.map(([x, y, z]) => new THREE.Vector3(x, y, z));
}

function sampleSegment(x0: number, y0: number, x1: number, y1: number, z: number, n: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, z]);
  }
  return pts;
}

function makeRibbon(points: THREE.Vector3[], color: THREE.Color, lift: number): THREE.ShaderMaterial {
  const geo = ribbonGeometry(points);
  const mat = new THREE.ShaderMaterial({
    vertexShader: ribbonVert,
    fragmentShader: ribbonFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uCenter: { value: 0 },
      uAmp: { value: 0 },
      uLift: { value: lift },
      uSharp: { value: 14 },
      uPhase: { value: 0 },
      uCarrier: { value: 0 },
      uColor: { value: color },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mat.userData.mesh = mesh;
  return mat;
}

function applyRibbon(mat: THREE.ShaderMaterial, state: RibbonState, reduced: boolean): void {
  mat.uniforms.uAmp.value = state.amp;
  mat.uniforms.uCenter.value = state.center;
  mat.uniforms.uSharp.value = state.sharp;
  mat.uniforms.uPhase.value = state.phase;
  mat.uniforms.uCarrier.value = reduced ? 0 : state.carrier;
}

function roundedPad(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const r = Math.min(0.16, w * 0.2, h * 0.2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - r);
  shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + h);
  shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.computeVertexNormals();
  return geo;
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  shadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function addRect(parent: THREE.Object3D, rect: Rect, mat: THREE.Material, z0: number, z1: number): THREE.Mesh {
  return addBox(
    parent,
    rect.x1 - rect.x0,
    rect.y1 - rect.y0,
    z1 - z0,
    mat,
    (rect.x0 + rect.x1) / 2,
    (rect.y0 + rect.y1) / 2,
    (z0 + z1) / 2,
  );
}

function snapOpen(value: number, reduced: boolean, floor: number): number {
  if (!reduced) return value;
  return value >= 0.5 ? 1 : floor;
}

export type SceneApi = {
  update(t: number, reduced: boolean): void;
  render(): void;
  resize(): void;
  project(anchor: [number, number, number]): { x: number; y: number; visible: boolean };
  setQuality(level: "high" | "low"): void;
  dispose(): void;
};

export function createScene(canvas: HTMLCanvasElement): SceneApi {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  if (!renderer.getContext()) throw new Error("WebGL context unavailable");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.setClearColor(0x090e17, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090e17);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  } catch (error) {
    console.warn("Environment map skipped", error);
  }

  const world = new THREE.Group();
  scene.add(world);

  const sapphire = new THREE.MeshPhysicalMaterial({
    color: 0x24344b,
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
  });
  const aluminum = new THREE.MeshStandardMaterial({
    color: 0xa7b3c2,
    metalness: 0.92,
    roughness: 0.28,
  });
  const packageMetal = new THREE.MeshStandardMaterial({
    color: 0x8e9bab,
    metalness: 0.86,
    roughness: 0.4,
  });
  const stageMetal = new THREE.MeshStandardMaterial({
    color: 0x667484,
    metalness: 0.72,
    roughness: 0.46,
  });
  const insulator = new THREE.MeshStandardMaterial({
    color: 0x6b5e54,
    roughness: 0.88,
    metalness: 0,
  });
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x98a4b3,
    metalness: 0.84,
    roughness: 0.34,
    transparent: true,
    opacity: 1,
  });
  for (const mat of [sapphire, aluminum, packageMetal, stageMetal, insulator, lidMat]) {
    mat.envMapIntensity = 0.42;
  }

  const ambient = new THREE.AmbientLight(0xc5d4e4, 0.55);
  const hemi = new THREE.HemisphereLight(0xdde6f0, 0x1c2838, 0.5);
  const key = new THREE.DirectionalLight(0xf7f9fb, 3.1);
  key.position.set(-6.2, -8.2, 9.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 28;
  key.shadow.bias = -0.00035;
  const rim = new THREE.DirectionalLight(0xc5d0dc, 0.55);
  rim.position.set(5.5, 6.5, 4);
  scene.add(ambient, hemi, key, rim);
  scene.add(key.target);

  const stage = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.28, 72), stageMetal);
  stage.rotation.x = Math.PI / 2;
  stage.position.z = -0.24;
  stage.receiveShadow = true;
  world.add(stage);

  const ringMat = new THREE.MeshStandardMaterial({ color: 0x516070, metalness: 0.6, roughness: 0.5 });
  for (const radius of [2.3, 3.7, 5.15]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 72), ringMat);
    ring.position.z = -0.09;
    world.add(ring);
  }
  for (const angle of [0.4, 2.5, 4.4]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.55, 12), stageMetal);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(Math.cos(angle) * 4.7, Math.sin(angle) * 4.7, -1.12);
    world.add(rod);
  }

  const pkgW = PACKAGE.x1 - PACKAGE.x0;
  const pkgH = PACKAGE.y1 - PACKAGE.y0;
  addBox(world, pkgW, pkgH, PACKAGE.floorZ1 - PACKAGE.floorZ0, packageMetal, 0, 0, (PACKAGE.floorZ0 + PACKAGE.floorZ1) / 2);
  const wallH = PACKAGE.wallTop - PACKAGE.floorZ1;
  const wallZ = PACKAGE.floorZ1 + wallH / 2;
  const t = PACKAGE.wallT;
  addBox(world, pkgW, t, wallH, packageMetal, 0, PACKAGE.y1 - t / 2, wallZ);
  addBox(world, pkgW, t, wallH, packageMetal, 0, PACKAGE.y0 + t / 2, wallZ);
  addBox(world, t, pkgH - t * 2, wallH, packageMetal, PACKAGE.x0 + t / 2, 0, wallZ);
  addBox(world, t, pkgH - t * 2, wallH, packageMetal, PACKAGE.x1 - t / 2, 0, wallZ);

  const lid = new THREE.Group();
  const lidMesh = addBox(
    lid,
    pkgW,
    pkgH,
    PACKAGE.lidZ1 - PACKAGE.lidZ0,
    lidMat,
    0,
    0,
    (PACKAGE.lidZ0 + PACKAGE.lidZ1) / 2,
    false,
  );
  lidMesh.castShadow = true;
  for (const [sx, sy] of [
    [PACKAGE.x0 + 0.45, PACKAGE.y0 + 0.4],
    [PACKAGE.x1 - 0.45, PACKAGE.y0 + 0.4],
    [PACKAGE.x0 + 0.45, PACKAGE.y1 - 0.4],
    [PACKAGE.x1 - 0.45, PACKAGE.y1 - 0.4],
  ] as const) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), lidMat);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(sx, sy, PACKAGE.lidZ1 + 0.02);
    lid.add(screw);
  }
  world.add(lid);

  addBox(world, 7.2, 4.5, 0.06, sapphire, 0, -0.05, 0.05, false);
  const subW = SUBSTRATE.x1 - SUBSTRATE.x0;
  const subH = SUBSTRATE.y1 - SUBSTRATE.y0;
  const substrate = addBox(
    world,
    subW,
    subH,
    Z.substrateTop - Z.substrateBottom,
    sapphire,
    0,
    0,
    (Z.substrateTop + Z.substrateBottom) / 2,
  );
  substrate.receiveShadow = true;

  const left = METALS.find((rect) => rect.id === "electrodeL");
  const right = METALS.find((rect) => rect.id === "electrodeR");
  if (!left || !right) throw new Error("electrodes missing");
  const padGeo = roundedPad(left.x1 - left.x0, left.y1 - left.y0, Z.metalTop - Z.substrateTop);
  for (const rect of [left, right]) {
    const mesh = new THREE.Mesh(padGeo, aluminum);
    mesh.position.set((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2, Z.substrateTop);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
  }
  for (const rect of METALS) {
    if (rect.id === "electrodeL" || rect.id === "electrodeR") continue;
    addRect(world, rect, aluminum, Z.substrateTop, Z.metalTop);
  }
  addRect(world, BARRIER, insulator, Z.substrateTop - 0.004, Z.metalTop + 0.012);

  const cyan = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
  const gold = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
  const plate = (x: number, y: number, w: number, h: number, mat: THREE.Material) => {
    addBox(world, w, h, 0.16, mat, x, y, 0.36, false);
  };
  plate(-2.08, 0.15, 0.028, 0.22, cyan);
  plate(-1.93, 0.15, 0.028, 0.22, cyan);
  plate(1.96, 0.45, 0.028, 0.28, gold);
  plate(2.08, 0.45, 0.028, 0.28, gold);
  plate(2.25, -1.76, 0.22, 0.028, gold);
  plate(2.25, -1.9, 0.22, 0.028, gold);

  const zLine = 0.27;
  const drivePts = linePoints(sampleSegment(-3.7, 0.15, -1.86, 0.15, zLine, 28));
  const inPts = linePoints(sampleSegment(-3.4, -2.1, 2.25, -2.1, zLine, 32));
  const outPts = linePoints(sampleSegment(2.25, -2.1, 3.3, -2.1, zLine, 16));
  const resPath: [number, number, number][] = [
    ...sampleSegment(2.25, 0.08, 2.25, 1.27, zLine, 8),
    ...sampleSegment(2.25, 1.27, 3.13, 1.27, zLine, 6).slice(1),
    ...sampleSegment(3.13, 1.27, 3.13, -0.33, zLine, 10).slice(1),
    ...sampleSegment(3.13, -0.33, 2.25, -0.33, zLine, 6).slice(1),
    ...sampleSegment(2.25, -0.33, 2.25, -1.6, zLine, 8).slice(1),
  ];
  const driveMat = makeRibbon(drivePts, new THREE.Color("#00E5FF"), 0.62);
  const inMat = makeRibbon(inPts, new THREE.Color("#FFD166"), 0.48);
  const outMat = makeRibbon(outPts, new THREE.Color("#FFD166"), 0.48);
  const resMat = makeRibbon(linePoints(resPath), new THREE.Color("#FFD166"), 0.28);
  world.add(driveMat.userData.mesh as THREE.Object3D);
  world.add(inMat.userData.mesh as THREE.Object3D);
  world.add(outMat.userData.mesh as THREE.Object3D);
  world.add(resMat.userData.mesh as THREE.Object3D);

  const mag = new THREE.Group();
  mag.position.set(MAG.x, MAG.y, MAG.z);
  const magAl = aluminum.clone();
  const magOx = insulator.clone();
  magAl.transparent = true;
  magOx.transparent = true;
  const leftBlock = addBox(mag, 0.92, 0.7, 0.46, magAl, -0.53, 0, 0.16, false);
  const rightBlock = addBox(mag, 0.92, 0.7, 0.46, magAl, 0.53, 0, 0.16, false);
  const magBarrier = addBox(mag, 0.18, 0.78, 0.56, magOx, 0, 0, 0.16, false);
  const barrierEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(magBarrier.geometry),
    new THREE.LineBasicMaterial({ color: 0xe4d5c6 }),
  );
  magBarrier.add(barrierEdges);
  const cohMat = new THREE.ShaderMaterial({
    vertexShader: cohVert,
    fragmentShader: cohFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
    uniforms: { uAlpha: { value: 1 } },
  });
  const coh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.72), cohMat);
  coh.rotation.x = Math.PI / 2;
  coh.position.set(0, -0.58, 0.22);
  mag.add(coh);

  const phiMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    roughness: 0.4,
    metalness: 0.05,
    transparent: true,
  });
  const phiCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.45, 0, 0.42),
    new THREE.Vector3(0, 0, 1.05),
    new THREE.Vector3(0.5, 0, 0.42),
  );
  const phi = new THREE.Mesh(new THREE.TubeGeometry(phiCurve, 28, 0.016, 8, false), phiMat);
  mag.add(phi);
  const tipDir = phiCurve.getPoint(1).sub(phiCurve.getPoint(0.9)).normalize();
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 10), phiMat);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);
  head.position.copy(phiCurve.getPoint(1));
  mag.add(head);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xa7b3c2, metalness: 0.7, roughness: 0.35, transparent: true });
  const frame = (x: number, z: number, w: number, h: number) => addBox(mag, w, 0.012, h, frameMat, x, -0.62, z, false);
  frame(0, 0.42, 2.3, 0.018);
  frame(0, -0.15, 2.3, 0.018);
  frame(-1.14, 0.135, 0.018, 0.58);
  frame(1.14, 0.135, 0.018, 0.58);
  world.add(mag);

  const linkMat = new THREE.MeshBasicMaterial({
    color: 0x9d4edd,
    transparent: true,
    opacity: 0.45,
    toneMapped: false,
  });
  const linkA = new THREE.Vector3(0, 0.15, 0.4);
  const linkB = new THREE.Vector3(MAG.x, MAG.y, MAG.z - 0.2);
  const linkDir = linkB.clone().sub(linkA);
  const linkLen = linkDir.length();
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, linkLen, 6), linkMat);
  link.position.copy(linkA).add(linkB).multiplyScalar(0.5);
  link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), linkDir.normalize());
  world.add(link);

  const anchor = new THREE.Vector3();
  let quality: "high" | "low" = window.innerWidth < 800 ? "low" : "high";
  if (quality === "low") {
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(1);
  }

  function resize(): void {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? window.innerWidth;
    const height = Math.max(220, parent?.clientHeight ?? window.innerHeight);
    const dpr = quality === "low" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function update(t: number, reduced: boolean): void {
    const cam = cameraAt(t, reduced);
    camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
    camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);

    const lidO = snapOpen(lidOpacity(t), reduced, 0.12);
    lidMat.opacity = lidO;
    lidMat.depthWrite = lidO > 0.55;
    lidMesh.castShadow = lidO > 0.6 && renderer.shadowMap.enabled;
    lid.visible = lidO > 0.03;

    const magO = snapOpen(magOpacity(t), reduced, 0);
    mag.visible = magO > 0.02;
    link.visible = mag.visible;
    for (const mat of [magAl, magOx, phiMat, frameMat]) mat.opacity = magO;
    linkMat.opacity = 0.4 * magO;
    cohMat.uniforms.uAlpha.value = magO;
    barrierEdges.visible = magO > 0.4;

    const control = controlSnapshot(t);
    const drive = driveRibbon(control, carrierClock(t));
    applyRibbon(driveMat, drive, reduced);
    const readout = readoutRibbons(t, SHOT);
    applyRibbon(inMat, readout.incoming, reduced);
    applyRibbon(outMat, readout.outgoing, reduced);
    applyRibbon(resMat, readout.resonator, reduced);

    void leftBlock;
    void rightBlock;
  }

  function render(): void {
    renderer.render(scene, camera);
  }

  function project(point: [number, number, number]): { x: number; y: number; visible: boolean } {
    anchor.set(point[0], point[1], point[2]);
    anchor.project(camera);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const visible = anchor.z < 1 && anchor.x > -1.2 && anchor.x < 1.2 && anchor.y > -1.2 && anchor.y < 1.2;
    return {
      x: (anchor.x * 0.5 + 0.5) * width,
      y: (-anchor.y * 0.5 + 0.5) * height,
      visible,
    };
  }

  function setQuality(level: "high" | "low"): void {
    quality = level;
    renderer.shadowMap.enabled = level === "high";
    resize();
  }

  function dispose(): void {
    renderer.dispose();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  }

  resize();
  return { update, render, resize, project, setQuality, dispose };
}
