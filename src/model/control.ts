/** Ideal rotating-frame π/2 control.
 *
 * Convention, fixed for the whole film:
 * |0⟩ is +Z (north). |1⟩ is −Z (south).
 * A positive envelope rotates about +X.
 * H_rot(t) = ℏ Ω(t) σ_x / 2
 * θ(t) = ∫ Ω(τ) dτ
 * |ψ⟩ = cos(θ/2)|0⟩ − i sin(θ/2)|1⟩
 *
 * The raised-cosine shape is normalized in presentation time so θ(final) = π/2.
 * No physical pulse duration or drive strength is assigned.
 * Bloch vector: (x, y, z) = (0, −sin θ, cos θ), from +Z to −Y.
 */

export const PULSE_START = 18;
export const PULSE_END = 23;

export type Bloch = { x: number; y: number; z: number };

export type ControlState = {
  u: number;
  envelope: number;
  theta: number;
  c0: number;
  c1Real: number;
  c1Imag: number;
  p0: number;
  p1: number;
  bloch: Bloch;
};

export function pulseU(t: number): number {
  if (t <= PULSE_START) return 0;
  if (t >= PULSE_END) return 1;
  return (t - PULSE_START) / (PULSE_END - PULSE_START);
}

/** Peak-normalized envelope. Integral over u of this shape is 1/2. */
export function envelopeShape(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  return 0.5 * (1 - Math.cos(2 * Math.PI * u));
}

export function thetaFromU(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return Math.PI / 2;
  return (Math.PI / 2) * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI));
}

export function blochFromTheta(theta: number): Bloch {
  return { x: 0, y: -Math.sin(theta), z: Math.cos(theta) };
}

export function controlAt(t: number): ControlState {
  const u = pulseU(t);
  const theta = thetaFromU(u);
  const half = theta / 2;
  const c0 = Math.cos(half);
  const c1Imag = -Math.sin(half);
  return {
    u,
    envelope: envelopeShape(u),
    theta,
    c0,
    c1Real: 0,
    c1Imag,
    p0: c0 * c0,
    p1: c1Imag * c1Imag,
    bloch: blochFromTheta(theta),
  };
}

export const LEVELS = [
  { id: "0", label: "|0⟩", energy: 0 },
  { id: "1", label: "|1⟩", energy: 1 },
  { id: "2", label: "|2⟩", energy: 1.72 },
] as const;

export function levelSpacings(): { e01: number; e12: number } {
  return {
    e01: LEVELS[1].energy - LEVELS[0].energy,
    e12: LEVELS[2].energy - LEVELS[1].energy,
  };
}
