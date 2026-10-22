import { controlAt, blochFromTheta, levelSpacings, thetaFromU, envelopeShape } from "../src/model/control.ts";
import {
  ALT0,
  ALT1,
  CLOUD0,
  CLOUD1,
  MU0,
  MU1,
  PREPARED_P0,
  SHOT,
  classify,
  drawShot,
  recordPolar,
} from "../src/model/measurement.ts";
import { ARCHITECTURE, topologyErrors } from "../src/layout.ts";
import { REQUIRED_PHRASES, staticCopyBlob } from "../src/copy.ts";
import { present } from "../src/present.ts";
import {
  CAMERA,
  DURATION,
  FRAME_COUNT,
  FPS,
  SHOTS,
  cameraAt,
  frameIndex,
  lidOpacity,
  readoutRibbons,
  shotAt,
} from "../src/timeline.ts";

const errors: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) errors.push(detail ? `${name}: ${detail}` : name);
};

const topology = topologyErrors();
check("topology", topology.length === 0, topology.join("; "));
check("barrier intact", ARCHITECTURE.barrierIntact);
check("no squid", ARCHITECTURE.squid === false && ARCHITECTURE.fluxBiasLine === false);

const end = controlAt(24);
check("theta final", Math.abs(end.theta - Math.PI / 2) < 1e-12, String(end.theta));
check("bloch end y", Math.abs(end.bloch.y + 1) < 1e-12, JSON.stringify(end.bloch));
check("bloch end z", Math.abs(end.bloch.z) < 1e-12);
check("bloch end x", Math.abs(end.bloch.x) < 1e-12);
check("c0", Math.abs(end.c0 - Math.SQRT1_2) < 1e-12);
check("c1 imag", Math.abs(end.c1Imag + Math.SQRT1_2) < 1e-12);
check("c1 real", end.c1Real === 0);
check("probabilities", Math.abs(end.p0 - 0.5) < 1e-12 && Math.abs(end.p1 - 0.5) < 1e-12);

const start = controlAt(0);
check("start +Z", start.bloch.z === 1 && start.bloch.y === 0 && start.p0 === 1);

let previous = -1;
for (let i = 0; i <= 40; i++) {
  const t = 18 + (5 * i) / 40;
  const state = controlAt(t);
  check(`norm ${i}`, Math.abs(state.p0 + state.p1 - 1) < 1e-12);
  check(`x ${i}`, Math.abs(state.bloch.x) < 1e-12);
  check(`y sign ${i}`, state.bloch.y <= 1e-9);
  check(`theta up ${i}`, state.theta + 1e-12 >= previous);
  previous = state.theta;
}

const theta = 0.4;
const eps = 1e-4;
const r1 = blochFromTheta(theta);
const r2 = blochFromTheta(theta + eps);
const dr = { x: (r2.x - r1.x) / eps, y: (r2.y - r1.y) / eps, z: (r2.z - r1.z) / eps };
const cross = { x: 0, y: -r1.z, z: r1.y };
check("rotation +X y", Math.abs(dr.y - cross.y) < 1e-4, JSON.stringify({ dr, cross }));
check("rotation +X z", Math.abs(dr.z - cross.z) < 1e-4);

let numeric = 0;
const n = 4000;
for (let i = 0; i < n; i++) {
  const u = (i + 0.5) / n;
  numeric += envelopeShape(u);
}
numeric /= n;
check("shape integral", Math.abs(numeric - 0.5) < 1e-4, String(numeric));
check("analytic end", Math.abs(thetaFromU(1) - Math.PI / 2) < 1e-15);

const gaps = levelSpacings();
check("anharmonic", gaps.e12 > 0 && gaps.e12 < gaps.e01, JSON.stringify(gaps));

check("p0 matches preparation", Math.abs(end.p0 - PREPARED_P0) < 1e-12);
check("classify mu0", classify(MU0.i, MU0.q) === 0);
check("classify mu1", classify(MU1.i, MU1.q) === 1);
const crossed = CLOUD0.some((p) => classify(p.i, p.q) === 1) || CLOUD1.some((p) => classify(p.i, p.q) === 0);
check("clouds overlap enough to misclassify some reference points", crossed);
const again = drawShot(PREPARED_P0);
check("shot stable", again.i === SHOT.i && again.q === SHOT.q && again.assignment === SHOT.assignment && again.basisSample === SHOT.basisSample);
check("one assignment", SHOT.assignment === 0 || SHOT.assignment === 1);

const early = readoutRibbons(27, SHOT);
check("incoming generic", early.incoming.source === "generic" && early.incoming.phase === 0 && early.incoming.amp > 0);
check("no outgoing yet", early.outgoing.amp === 0 && early.outgoing.source === "off");
const mid = readoutRibbons(28.5, SHOT);
check("resonator generic before record", mid.resonator.source === "generic" && mid.outgoing.amp === 0);
const late = readoutRibbons(30, SHOT);
const polar = recordPolar(SHOT.i, SHOT.q);
check("outgoing matches record phase", Math.abs(late.outgoing.phase - polar.phase) < 1e-12);
check("outgoing source", late.outgoing.source === "integrated-record");
check("resonator matches record", late.resonator.source === "integrated-record" && Math.abs(late.resonator.phase - polar.phase) < 1e-12);
check("not the mean-phase average", Math.abs(late.outgoing.phase - (ALT0.phase + ALT1.phase) / 2) > 1e-3);

const blob = staticCopyBlob();
for (const phrase of REQUIRED_PHRASES) {
  check(`phrase: ${phrase}`, blob.includes(phrase));
}
check("primary hides basis value early", !present(10).primary.includes("Seeded basis sample"));
check("primary hides basis value at result", !present(33).primary.includes("Seeded basis sample"));
check("assignment hidden early", present(32).assignmentLine === "");
check("assignment shown", present(33).assignmentLine === `Reported assignment: ${SHOT.assignment}`);

check("duration", DURATION === 34 && FPS === 30 && FRAME_COUNT === 1020);
check("frame 0", frameIndex(0) === 0);
check("frame 5s", frameIndex(5) === 150);
check("frame before 5", frameIndex(4.999) === 149);
check("frame 10", frameIndex(10) === 300);
check("frame 17", frameIndex(17) === 510);
check("frame 25", frameIndex(25) === 750);
check("frame end", frameIndex(34) === 1019 && frameIndex(33.999) === 1019);
check("shot edges", shotAt(0).id === 1 && shotAt(5).id === 2 && shotAt(10).id === 3 && shotAt(17).id === 4 && shotAt(25).id === 5 && shotAt(34).id === 5);

let covered = 0;
for (const shot of SHOTS) covered += shot.end - shot.start;
check("shots cover 34s", covered === 34);

const camA = cameraAt(33, false);
const camB = cameraAt(34, false);
check("camera hold", camA.pos.every((v, i) => v === camB.pos[i]) && camA.look.every((v, i) => v === camB.look[i]));
check("lid never removed", lidOpacity(0) === 1 && lidOpacity(34) === 0.12 && lidOpacity(34) > 0);
check("camera keys reach 34", CAMERA[CAMERA.length - 1].t === 34 && CAMERA.some((key) => key.t === 30));

if (errors.length) {
  console.error(errors.join("\n"));
  throw new Error(`${errors.length} validation checks failed`);
}

console.log(JSON.stringify({
  checks: "passed",
  shot: {
    i: SHOT.i,
    q: SHOT.q,
    assignment: SHOT.assignment,
    agrees: SHOT.agrees,
  },
  cloud0: CLOUD0.length,
  cloud1: CLOUD1.length,
  thetaFinal: end.theta,
  bloch: end.bloch,
}, null, 2));
