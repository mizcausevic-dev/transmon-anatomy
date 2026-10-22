export type Rect = {
  id: string;
  node: NodeId;
  kind: "metal" | "insulator";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type NodeId = "left" | "right" | "drive" | "resonator" | "feed";

export const Z = {
  pedestalBottom: 0.02,
  pedestalTop: 0.08,
  substrateBottom: 0.08,
  substrateTop: 0.2,
  metalTop: 0.25,
};

export const SUBSTRATE = { x0: -3.9, y0: -2.5, x1: 3.9, y1: 2.5 };

export const PACKAGE = {
  x0: -4.75,
  x1: 4.75,
  y0: -2.9,
  y1: 2.9,
  floorZ0: -0.1,
  floorZ1: 0.02,
  wallTop: 0.98,
  wallT: 0.16,
  lidZ0: 0.98,
  lidZ1: 1.1,
};

export const MAG = { x: 0, y: 0.12, z: 1.62 };

const electrodeL: Rect = {
  id: "electrodeL",
  node: "left",
  kind: "metal",
  x0: -1.86,
  y0: -0.88,
  x1: -0.38,
  y1: 0.98,
};
const fingerL: Rect = {
  id: "fingerL",
  node: "left",
  kind: "metal",
  x0: -0.4,
  y0: 0.02,
  x1: -0.08,
  y1: 0.28,
};
const fingerR: Rect = {
  id: "fingerR",
  node: "right",
  kind: "metal",
  x0: 0.08,
  y0: 0.02,
  x1: 0.4,
  y1: 0.28,
};
const electrodeR: Rect = {
  id: "electrodeR",
  node: "right",
  kind: "metal",
  x0: 0.38,
  y0: -0.88,
  x1: 1.86,
  y1: 0.98,
};
const drive: Rect = {
  id: "drive",
  node: "drive",
  kind: "metal",
  x0: -3.58,
  y0: 0.05,
  x1: -2.14,
  y1: 0.25,
};
const drivePad: Rect = {
  id: "drivePad",
  node: "drive",
  kind: "metal",
  x0: -3.76,
  y0: -0.14,
  x1: -3.4,
  y1: 0.44,
};

export const RESONATOR: Rect[] = [
  { id: "r1", node: "resonator", kind: "metal", x0: 2.16, y0: 0.02, x1: 2.34, y1: 1.36 },
  { id: "r2", node: "resonator", kind: "metal", x0: 2.16, y0: 1.18, x1: 3.22, y1: 1.36 },
  { id: "r3", node: "resonator", kind: "metal", x0: 3.04, y0: -0.42, x1: 3.22, y1: 1.36 },
  { id: "r4", node: "resonator", kind: "metal", x0: 2.16, y0: -0.42, x1: 3.22, y1: -0.24 },
  { id: "r5", node: "resonator", kind: "metal", x0: 2.16, y0: -1.66, x1: 2.34, y1: -0.24 },
];

const feed: Rect = {
  id: "feed",
  node: "feed",
  kind: "metal",
  x0: -3.55,
  y0: -2.2,
  x1: 3.4,
  y1: -2.0,
};

export const BARRIER: Rect = {
  id: "barrier",
  node: "left",
  kind: "insulator",
  x0: -0.09,
  y0: -0.02,
  x1: 0.09,
  y1: 0.32,
};

export const METALS: Rect[] = [
  electrodeL,
  fingerL,
  fingerR,
  electrodeR,
  drive,
  drivePad,
  ...RESONATOR,
  feed,
];

export const ARCHITECTURE = {
  kind: "fixed-frequency-single-junction-transmon",
  squid: false,
  fluxBiasLine: false,
  barrierIntact: true,
  electrodesJoinedOnlyBy: "josephson-junction",
  driveCoupling: "capacitive-gap",
  resonatorCoupling: "capacitive-gap",
  feedlineCoupling: "capacitive-gap",
} as const;

export function aabbGap(a: Rect, b: Rect): number {
  const gapX = Math.max(a.x0 - b.x1, b.x0 - a.x1);
  const gapY = Math.max(a.y0 - b.y1, b.y0 - a.y1);
  if (gapX < 0 && gapY < 0) return Math.max(gapX, gapY);
  if (gapX < 0) return gapY;
  if (gapY < 0) return gapX;
  return Math.hypot(gapX, gapY);
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 - 1e-9 && b.x0 < a.x1 - 1e-9 && a.y0 < b.y1 - 1e-9 && b.y0 < a.y1 - 1e-9;
}

function componentCount(parts: Rect[]): number {
  const parent = parts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const unite = (i: number, j: number) => {
    const a = find(i);
    const b = find(j);
    if (a !== b) parent[b] = a;
  };
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      if (aabbGap(parts[i], parts[j]) <= 1e-6) unite(i, j);
    }
  }
  return new Set(parts.map((_, i) => find(i))).size;
}

export function topologyErrors(): string[] {
  const errors: string[] = [];
  if (!ARCHITECTURE.barrierIntact) errors.push("barrier flagged open");
  if (ARCHITECTURE.squid || ARCHITECTURE.fluxBiasLine) errors.push("flux tuning was introduced");

  const nodes: NodeId[] = ["left", "right", "drive", "resonator", "feed"];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = METALS.filter((m) => m.node === nodes[i]);
      const b = METALS.filter((m) => m.node === nodes[j]);
      let gap = Infinity;
      for (const ra of a) for (const rb of b) gap = Math.min(gap, aabbGap(ra, rb));
      if (gap <= 0) errors.push(`${nodes[i]} shorts ${nodes[j]}`);
      if (gap < 0.15) errors.push(`${nodes[i]} to ${nodes[j]} gap ${gap.toFixed(3)} is under 0.15`);
    }
  }

  for (const node of nodes) {
    const parts = METALS.filter((m) => m.node === node);
    if (componentCount(parts) !== 1) errors.push(`${node} metal is not one connected conductor`);
  }

  const left = METALS.filter((m) => m.node === "left");
  const right = METALS.filter((m) => m.node === "right");
  for (const metal of [...left, ...right]) {
    if (metal.kind !== "metal") errors.push("metal list contained a non-metal");
  }
  const barrierHitsLeft = left.some((m) => overlaps(m, BARRIER));
  const barrierHitsRight = right.some((m) => overlaps(m, BARRIER));
  if (!barrierHitsLeft || !barrierHitsRight) {
    errors.push("barrier does not contact both electrodes");
  }
  for (const metal of METALS) {
    if (metal.node !== "left" && metal.node !== "right" && overlaps(metal, BARRIER)) {
      errors.push(`${metal.id} intersects the barrier`);
    }
  }
  const metalGap = Math.min(
    ...left.flatMap((a) => right.map((b) => aabbGap(a, b))),
  );
  if (!(metalGap > 0)) errors.push("left and right metal are not separated");

  for (const metal of METALS) {
    if (metal.x0 < SUBSTRATE.x0 || metal.x1 > SUBSTRATE.x1 || metal.y0 < SUBSTRATE.y0 || metal.y1 > SUBSTRATE.y1) {
      errors.push(`${metal.id} leaves the substrate`);
    }
  }
  return errors;
}

export type CalloutId =
  | "transmon"
  | "drive"
  | "resonator"
  | "feed"
  | "junction"
  | "barrier"
  | "phase"
  | "mag";

export const ANCHORS: Record<CalloutId, [number, number, number]> = {
  transmon: [0.15, 0.05, 0.48],
  drive: [-2.85, 0.15, 0.46],
  resonator: [2.7, 0.55, 0.48],
  feed: [0.1, -2.1, 0.46],
  junction: [0, 0.15, 0.5],
  barrier: [0, 0.15, 0.62],
  phase: [0.15, 0.12, MAG.z + 0.95],
  mag: [-0.85, 0.12, MAG.z + 0.35],
};
