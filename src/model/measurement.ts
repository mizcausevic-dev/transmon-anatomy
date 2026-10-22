/** Synthetic readout.
 *
 * Ideal computational-basis measurement plus isotropic Gaussian noise.
 * This is not continuous measurement, resonator entanglement, relaxation,
 * or measurement-induced leakage.
 *
 * The basis sample is drawn when the shot is created, from the prepared
 * probabilities. It is a simulation variable. It is not a pre-existing
 * hidden state, and it is not shown as something the record contains.
 *
 * The stored point is one demodulated, integrated I–Q record, in arbitrary
 * units. Reference clouds are repeated preparations, generated once.
 */

export const SIGMA = 0.78;
export const MU0 = { i: -1.05, q: 0.22 };
export const MU1 = { i: 1.05, q: -0.18 };
export const CLOUD_COUNT = 80;
export const SEED_CLOUD0 = 0x0c10d0;
export const SEED_CLOUD1 = 0x0c10d1;
export const SEED_SHOT = 0x51a7c0de;
export const PREPARED_P0 = 0.5;

export type IQ = { i: number; q: number };

export type ShotRecord = {
  basisSample: 0 | 1;
  i: number;
  q: number;
  assignment: 0 | 1;
  agrees: boolean;
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function classify(i: number, q: number): 0 | 1 {
  const mx = (MU0.i + MU1.i) / 2;
  const my = (MU0.q + MU1.q) / 2;
  const nx = MU1.i - MU0.i;
  const ny = MU1.q - MU0.q;
  const side = (i - mx) * nx + (q - my) * ny;
  return side > 0 ? 1 : 0;
}

export function boundarySegment(extent = 2.5): [IQ, IQ] {
  const mx = (MU0.i + MU1.i) / 2;
  const my = (MU0.q + MU1.q) / 2;
  const nx = MU1.i - MU0.i;
  const ny = MU1.q - MU0.q;
  const len = Math.hypot(nx, ny);
  const dx = -ny / len;
  const dy = nx / len;
  return [
    { i: mx - dx * extent, q: my - dy * extent },
    { i: mx + dx * extent, q: my + dy * extent },
  ];
}

function cloud(seed: number, mu: IQ): IQ[] {
  const rng = mulberry32(seed);
  const pts: IQ[] = [];
  for (let n = 0; n < CLOUD_COUNT; n++) {
    pts.push({
      i: mu.i + SIGMA * gaussian(rng),
      q: mu.q + SIGMA * gaussian(rng),
    });
  }
  return pts;
}

export function drawShot(p0: number, seed = SEED_SHOT): ShotRecord {
  const rng = mulberry32(seed);
  const basisSample: 0 | 1 = rng() < p0 ? 0 : 1;
  const mu = basisSample === 0 ? MU0 : MU1;
  const i = mu.i + SIGMA * gaussian(rng);
  const q = mu.q + SIGMA * gaussian(rng);
  const assignment = classify(i, q);
  return { basisSample, i, q, assignment, agrees: basisSample === assignment };
}

export const CLOUD0: readonly IQ[] = cloud(SEED_CLOUD0, MU0);
export const CLOUD1: readonly IQ[] = cloud(SEED_CLOUD1, MU1);
export const SHOT: ShotRecord = drawShot(PREPARED_P0, SEED_SHOT);

export type Polar = { amp: number; phase: number; ampNorm: number };

export function recordPolar(i: number, q: number): Polar {
  const amp = Math.hypot(i, q);
  return { amp, phase: Math.atan2(q, i), ampNorm: Math.min(1, amp / 2.2) };
}

export const ALT0 = recordPolar(MU0.i, MU0.q);
export const ALT1 = recordPolar(MU1.i, MU1.q);
export const SHOT_POLAR = recordPolar(SHOT.i, SHOT.q);

export function simulatorNote(record: ShotRecord = SHOT): string {
  const relation = record.agrees
    ? "For this fixed seed, the basis sample and the reported assignment match."
    : "For this fixed seed, the basis sample and the reported assignment differ.";
  return (
    "Simulator comparison, unavailable from the single integrated record. " +
    "The basis sample is drawn inside the synthetic model when the shot is created. " +
    "It is not a pre-existing hidden state. " +
    `${relation} Seeded basis sample: ${record.basisSample}. Reported assignment: ${record.assignment}.`
  );
}
