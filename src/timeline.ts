import { controlAt, type ControlState } from "./model/control";
import {
  ALT0,
  ALT1,
  SHOT,
  recordPolar,
  type ShotRecord,
} from "./model/measurement";

export const DURATION = 34;
export const FPS = 30;
export const FRAME_COUNT = 1020;

export const SHOTS = [
  { id: 1, name: "Cryogenic chip", start: 0, end: 5 },
  { id: 2, name: "Junction and capacitance", start: 5, end: 10 },
  { id: 3, name: "Energy levels", start: 10, end: 17 },
  { id: 4, name: "Microwave control", start: 17, end: 25 },
  { id: 5, name: "Readout and one assignment", start: 25, end: 34 },
] as const;

export function clampTime(t: number): number {
  if (t < 0) return 0;
  if (t > DURATION) return DURATION;
  return t;
}

export function frameIndex(t: number): number {
  if (t <= 0) return 0;
  if (t >= DURATION) return FRAME_COUNT - 1;
  return Math.min(FRAME_COUNT - 1, Math.floor(t * FPS + 1e-8));
}

export function shotAt(t: number): (typeof SHOTS)[number] {
  const time = clampTime(t);
  for (const shot of SHOTS) {
    if (time >= shot.start && time < shot.end) return shot;
  }
  return SHOTS[SHOTS.length - 1];
}

export function formatTime(t: number): string {
  const c = clampTime(t);
  const whole = Math.floor(c);
  const ms = Math.floor((c - whole) * 1000 + 1e-6);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export type CameraKey = { t: number; pos: [number, number, number]; look: [number, number, number] };

export const CAMERA: CameraKey[] = [
  { t: 0, pos: [10.5, -13.5, 8.6], look: [0, -0.2, 0.2] },
  { t: 2.4, pos: [6.4, -8.4, 5.2], look: [0, 0, 0.35] },
  { t: 5, pos: [2.4, -4.6, 2.8], look: [0, 0.08, 0.32] },
  { t: 6.7, pos: [0.35, -1.7, 1.55], look: [0, 0.12, 0.24] },
  { t: 8.6, pos: [1.45, -1.25, 2.7], look: [0, 0.12, 1.72] },
  { t: 10, pos: [3.6, -5.6, 3.7], look: [0.15, 0.05, 0.38] },
  { t: 14, pos: [4.4, -6.4, 4.2], look: [0.25, 0, 0.34] },
  { t: 17, pos: [-4.4, -5.1, 3.1], look: [-1.5, 0.12, 0.3] },
  { t: 21, pos: [-1.5, -3.4, 2.3], look: [-0.2, 0.12, 0.28] },
  { t: 25, pos: [3.4, -5.1, 3.05], look: [1.55, -0.75, 0.3] },
  { t: 30, pos: [3.8, -5.5, 3.3], look: [1.35, -1.15, 0.28] },
  { t: 34, pos: [3.8, -5.5, 3.3], look: [1.35, -1.15, 0.28] },
];

function smoothstep(x: number): number {
  const u = Math.min(1, Math.max(0, x));
  return u * u * (3 - 2 * u);
}

function lerpTuple(a: [number, number, number], b: [number, number, number], u: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

export function cameraAt(t: number, reduced: boolean): { pos: [number, number, number]; look: [number, number, number] } {
  const time = clampTime(t);
  if (reduced) {
    let best = CAMERA[0];
    let dist = Infinity;
    for (const key of CAMERA) {
      const d = Math.abs(key.t - time);
      if (d < dist) {
        dist = d;
        best = key;
      }
    }
    return { pos: best.pos, look: best.look };
  }
  if (time <= CAMERA[0].t) return { pos: CAMERA[0].pos, look: CAMERA[0].look };
  const last = CAMERA[CAMERA.length - 1];
  if (time >= last.t) return { pos: last.pos, look: last.look };
  let i = 0;
  while (i < CAMERA.length - 1 && time >= CAMERA[i + 1].t) i++;
  const a = CAMERA[i];
  const b = CAMERA[i + 1];
  const u = smoothstep((time - a.t) / (b.t - a.t));
  return { pos: lerpTuple(a.pos, b.pos, u), look: lerpTuple(a.look, b.look, u) };
}

export function lidOpacity(t: number): number {
  if (t <= 0.7) return 1;
  if (t >= 2.6) return 0.12;
  const u = (t - 0.7) / (2.6 - 0.7);
  const s = u * u * (3 - 2 * u);
  return 1 - 0.88 * s;
}

export function magOpacity(t: number): number {
  if (t < 7.2 || t >= 10.5) return 0;
  if (t < 7.8) return (t - 7.2) / 0.6;
  if (t < 9.6) return 1;
  return Math.max(0, 1 - (t - 9.6) / 0.9);
}

export function blochOpacity(t: number): number {
  if (t < 17) return 0;
  if (t < 17.5) return (t - 17) / 0.5;
  if (t < 30.2) return 1;
  if (t < 31.5) return Math.max(0, 1 - (t - 30.2) / 1.3);
  return 0;
}

export function panelOpacity(t: number, panel: "circuit" | "levels" | "bloch" | "iq"): number {
  if (panel === "circuit") {
    if (t < 8.2 || t >= 12.6) return 0;
    if (t < 8.7) return (t - 8.2) / 0.5;
    if (t < 12) return 1;
    return Math.max(0, 1 - (t - 12) / 0.6);
  }
  if (panel === "levels") {
    if (t < 10.2 || t >= 17.8) return 0;
    if (t < 10.8) return (t - 10.2) / 0.6;
    if (t < 17.2) return 1;
    return Math.max(0, 1 - (t - 17.2) / 0.6);
  }
  if (panel === "bloch") return blochOpacity(t);
  if (t < 28) return 0;
  if (t < 28.5) return (t - 28) / 0.5;
  return 1;
}

export type RibbonState = {
  amp: number;
  phase: number;
  center: number;
  sharp: number;
  carrier: number;
  source: "off" | "generic" | "envelope" | "integrated-record";
};

function hiddenRibbon(): RibbonState {
  return { amp: 0, phase: 0, center: 0, sharp: 16, carrier: 0, source: "off" };
}

export function driveRibbon(control: ControlState, t: number): RibbonState {
  return {
    amp: control.envelope,
    phase: Math.min(t, 33) * 2.4,
    center: control.u,
    sharp: 14,
    carrier: t >= 18 && t < 23 ? 1 : 0,
    source: control.envelope > 0 ? "envelope" : "off",
  };
}

/** Incoming probe is generic. Outgoing probe matches the integrated record. */
export function readoutRibbons(t: number, record: ShotRecord = SHOT): {
  incoming: RibbonState;
  outgoing: RibbonState;
  resonator: RibbonState;
} {
  const incoming = hiddenRibbon();
  if (t >= 26.2 && t < 28) {
    incoming.amp = 0.72;
    incoming.phase = 0;
    incoming.center = (t - 26.2) / 1.8;
    incoming.sharp = 16;
    incoming.carrier = 1;
    incoming.source = "generic";
  }

  const polar = recordPolar(record.i, record.q);
  const outgoing = hiddenRibbon();
  if (t >= 29.2 && t < 30.8) {
    outgoing.amp = 0.35 + 0.65 * polar.ampNorm;
    outgoing.phase = polar.phase;
    outgoing.center = (t - 29.2) / 1.6;
    outgoing.sharp = 16;
    outgoing.carrier = 1;
    outgoing.source = "integrated-record";
  }

  const resonator = hiddenRibbon();
  resonator.sharp = 0.35;
  resonator.center = 0.5;
  if (t >= 28 && t < 29.2) {
    resonator.amp = 0.38;
    resonator.phase = 0;
    resonator.carrier = 1;
    resonator.source = "generic";
  } else if (t >= 29.2) {
    resonator.amp = 0.28 + 0.5 * polar.ampNorm;
    resonator.phase = polar.phase;
    resonator.carrier = 1;
    resonator.source = "integrated-record";
  }

  return { incoming, outgoing, resonator };
}

export function alternatives() {
  return {
    zero: ALT0,
    one: ALT1,
  };
}

export function assignmentVisible(t: number): boolean {
  return t >= 32.8;
}

export function recordVisible(t: number): boolean {
  return t >= 32.3;
}

export function cloudsVisible(t: number): boolean {
  return t >= 31.7;
}

export function carrierClock(t: number): number {
  return Math.min(clampTime(t), 33);
}

export function controlSnapshot(t: number): ControlState {
  return controlAt(t);
}
