import { CALLOUT_TEXT, CAPTIONS, EVIDENCE, PANEL, captionAt } from "./copy";
import type { CalloutId } from "./layout";
import { SHOT } from "./model/measurement";
import {
  assignmentVisible,
  cloudsVisible,
  controlSnapshot,
  recordVisible,
  shotAt,
} from "./timeline";

export function calloutsAt(t: number): CalloutId[] {
  if (t < 5) return ["transmon", "drive", "resonator"];
  if (t < 7.2) return ["junction", "barrier"];
  if (t < 10.5) return ["mag", "barrier", "phase"];
  if (t < 17) return ["transmon"];
  if (t < 25) return ["drive", "transmon"];
  return ["resonator", "feed"];
}

export function kickerAt(t: number): string {
  if (t >= 28) return "Synthetic measurement. Not a live state inside the chip.";
  if (t >= 17) return "Mathematical state. Not an object inside the device.";
  if (t >= 10) return "Energy diagram. Qualitative spacings.";
  if (t >= 8.2) return "Equivalent circuit. Same topology as the chip.";
  return "Hardware context.";
}

function formatState(t: number): string {
  const c = controlSnapshot(t);
  if (c.theta <= 1e-9) return "|0⟩";
  if (c.theta >= Math.PI / 2 - 1e-9) return "(|0⟩ − i|1⟩)/√2";
  return `${c.c0.toFixed(2)}|0⟩ − i ${Math.abs(c.c1Imag).toFixed(2)}|1⟩`;
}

function formatTheta(t: number): string {
  const c = controlSnapshot(t);
  if (c.theta >= Math.PI / 2 - 1e-9) return "θ = π/2";
  return `θ/π = ${(c.theta / Math.PI).toFixed(3)}`;
}

function formatBloch(t: number): string {
  const b = controlSnapshot(t).bloch;
  if (b.z > 0.999) return "(x, y, z) = (0, 0, +1) · +Z";
  if (Math.abs(b.y + 1) < 1e-9 && Math.abs(b.z) < 1e-9) return "(x, y, z) = (0, −1, 0) · −Y";
  return `(x, y, z) = (0, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})`;
}

function formatProb(t: number): string {
  const c = controlSnapshot(t);
  if (Math.abs(c.p0 - 0.5) < 1e-9 && Math.abs(c.p1 - 0.5) < 1e-9) {
    return "P(0) = P(1) = 1/2 in this ideal preparation.";
  }
  return `P(0) = ${c.p0.toFixed(2)} · P(1) = ${c.p1.toFixed(2)}`;
}

export function present(t: number): {
  evidence: string;
  shotName: string;
  kicker: string;
  caption: string;
  callouts: { id: CalloutId; text: string }[];
  stateLine: string;
  thetaLine: string;
  blochLine: string;
  probLine: string;
  qualifier: string;
  assignmentLine: string;
  primary: string;
} {
  const caption = captionAt(t);
  const assignmentLine = assignmentVisible(t) ? `Reported assignment: ${SHOT.assignment}` : "";
  const qualifier = t >= 27 && t < 31.5 ? PANEL.qualifier : "";
  const callouts = calloutsAt(t).map((id) => ({ id, text: CALLOUT_TEXT[id] }));
  const stateLine = formatState(t);
  const thetaLine = formatTheta(t);
  const blochLine = formatBloch(t);
  const probLine = formatProb(t);
  const primary = [
    EVIDENCE,
    kickerAt(t),
    caption,
    ...callouts.map((c) => c.text),
    stateLine,
    thetaLine,
    blochLine,
    probLine,
    qualifier,
    assignmentLine,
    PANEL.blochTitle,
    PANEL.blochSubtitle,
    PANEL.iqTitle,
    PANEL.basisLine,
    PANEL.recordLine,
    PANEL.integratedLine,
    PANEL.axisI,
    PANEL.axisQ,
    PANEL.units,
    PANEL.cloud0,
    PANEL.cloud1,
    cloudsVisible(t) ? "clouds" : "",
    recordVisible(t) ? PANEL.recordLine : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    evidence: EVIDENCE,
    shotName: shotAt(t).name,
    kicker: kickerAt(t),
    caption,
    callouts,
    stateLine,
    thetaLine,
    blochLine,
    probLine,
    qualifier,
    assignmentLine,
    primary,
  };
}

export function captionCount(): number {
  return CAPTIONS.length;
}
