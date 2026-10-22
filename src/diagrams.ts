import { PANEL } from "./copy";
import { envelopeShape } from "./model/control";
import { LEVELS } from "./model/control";
import {
  ALT0,
  ALT1,
  CLOUD0,
  CLOUD1,
  SHOT,
  boundarySegment,
  simulatorNote,
} from "./model/measurement";
import { present } from "./present";
import {
  assignmentVisible,
  cloudsVisible,
  controlSnapshot,
  panelOpacity,
  recordVisible,
} from "./timeline";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function snap(value: number, reduced: boolean): number {
  if (!reduced) return value;
  return value >= 0.5 ? 1 : 0;
}

export type DiagramApi = {
  update(t: number, reduced: boolean): void;
};

export function mountDiagrams(root: HTMLElement): DiagramApi {
  root.innerHTML = "";
  const kicker = document.createElement("p");
  kicker.id = "kicker";
  const caption = document.createElement("p");
  caption.id = "caption";
  root.append(kicker, caption);

  const circuit = section("circuit", PANEL.circuitTitle);
  circuit.append(circuitSvg(), note(PANEL.circuitNote));
  const levels = section("levels", PANEL.levelsTitle);
  const levelSvg = levelsSvg();
  levels.append(levelSvg.svg, note(PANEL.levelsNote), note("Junction nonlinearity enables selective control. Large shunting capacitance reduces charge sensitivity."));
  const bloch = section("bloch", PANEL.blochTitle);
  const blochView = buildBlochSvg();
  const sub = document.createElement("p");
  sub.className = "subhead";
  sub.textContent = PANEL.blochSubtitle;
  const convention = note(PANEL.blochConvention);
  const law = note(`${PANEL.hamiltonian} ${PANEL.stateLaw}`);
  const state = document.createElement("p");
  state.className = "readout-num";
  const theta = document.createElement("p");
  theta.className = "readout-num";
  const vector = document.createElement("p");
  vector.className = "readout-num";
  const prob = document.createElement("p");
  prob.className = "readout-num";
  const qualifier = document.createElement("p");
  qualifier.className = "qualifier";
  bloch.append(sub, blochView.svg, convention, law, state, theta, vector, prob, qualifier);

  const iq = section("iq", PANEL.iqTitle);
  iq.append(note("Dispersive readout · schematic. Qubit-dependent resonator response."));
  iq.append(note(PANEL.iqNote));
  iq.append(note(PANEL.basisLine));
  iq.append(alternatives());
  const chain = processingChain();
  iq.append(chain.list);
  const plot = iqSvg();
  iq.append(plot.svg);
  const assignment = document.createElement("p");
  assignment.id = "assignment";
  assignment.className = "assignment";
  const integrated = note(PANEL.integratedLine);
  const sim = document.createElement("details");
  sim.id = "sim-note";
  const summary = document.createElement("summary");
  summary.textContent = "Simulator comparison, not part of the experimental record";
  const simBody = document.createElement("p");
  sim.append(summary, simBody);
  sim.hidden = true;
  iq.append(integrated, assignment, sim);
  root.append(circuit, levels, bloch, iq);

  const panels = { circuit, levels, bloch, iq };

  function update(t: number, reduced: boolean): void {
    const view = present(t);
    kicker.textContent = view.kicker;
    caption.textContent = view.caption;
    for (const key of ["circuit", "levels", "bloch", "iq"] as const) {
      const opacity = snap(panelOpacity(t, key), reduced);
      const el = panels[key];
      el.hidden = opacity <= 0;
      el.style.opacity = String(opacity);
    }
    levelSvg.highlight.style.opacity = t >= 12 && t < 25 ? "1" : "0.35";
    blochView.arc.setAttribute("points", arcPoints(controlSnapshot(t).theta));
    const tip = tipPoint(controlSnapshot(t).theta);
    blochView.vector.setAttribute("x2", tip.x);
    blochView.vector.setAttribute("y2", tip.y);
    blochView.playhead.setAttribute("x1", tip.spark);
    blochView.playhead.setAttribute("x2", tip.spark);
    state.textContent = view.stateLine;
    theta.textContent = view.thetaLine;
    vector.textContent = view.blochLine;
    prob.textContent = view.probLine;
    qualifier.textContent = view.qualifier;
    qualifier.hidden = view.qualifier.length === 0;

    chain.chip.classList.toggle("is-now", t >= 26.2 && t < 30.4);
    chain.amp.classList.toggle("is-now", t >= 30.4 && t < 31.5);
    chain.room.classList.toggle("is-now", t >= 31.5);
    chain.chip.querySelector(".now")!.toggleAttribute("hidden", !(t >= 26.2 && t < 30.4));
    chain.amp.querySelector(".now")!.toggleAttribute("hidden", !(t >= 30.4 && t < 31.5));
    chain.room.querySelector(".now")!.toggleAttribute("hidden", !(t >= 31.5));

    const showClouds = cloudsVisible(t);
    plot.clouds.setAttribute("opacity", showClouds ? "1" : "0");
    plot.boundary.setAttribute("opacity", showClouds ? "1" : "0");
    const showRecord = recordVisible(t);
    plot.shot.setAttribute("opacity", showRecord ? "1" : "0");
    assignment.textContent = view.assignmentLine;
    assignment.hidden = view.assignmentLine.length === 0;
    if (assignmentVisible(t)) {
      sim.hidden = false;
      if (!simBody.textContent) simBody.textContent = simulatorNote(SHOT);
    } else {
      sim.hidden = true;
      simBody.textContent = "";
      sim.open = false;
    }
  }

  return { update };
}

function section(id: string, title: string): HTMLElement {
  const el = document.createElement("section");
  el.id = `panel-${id}`;
  el.className = "panel";
  const h = document.createElement("h2");
  h.textContent = title;
  el.append(h);
  return el;
}

function note(text: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = "note";
  p.textContent = text;
  return p;
}

function circuitSvg(): SVGSVGElement {
  const svg = svgEl("svg", { viewBox: "0 0 360 168", role: "img" });
  svg.append(svgEl("title", {}), textNode(""));
  const title = svg.querySelector("title");
  if (title) title.textContent = "Equivalent circuit. Junction in parallel with the shunt capacitance.";
  const g = svgEl("g", { fill: "none", stroke: "#C5D0DC", "stroke-width": "1.6" });
  const line = (x1: string, y1: string, x2: string, y2: string, extra: Record<string, string> = {}) => {
    g.append(svgEl("line", { x1, y1, x2, y2, ...extra }));
  };
  line("16", "78", "70", "78");
  line("78", "70", "78", "86");
  line("86", "70", "86", "86");
  line("86", "78", "130", "78");
  line("130", "78", "130", "36");
  line("130", "78", "130", "124");
  line("130", "36", "230", "36");
  line("130", "124", "230", "124");
  line("168", "48", "192", "64");
  line("192", "48", "168", "64");
  line("206", "28", "206", "44");
  line("214", "28", "214", "44");
  line("230", "36", "230", "124");
  line("230", "78", "268", "78");
  line("276", "70", "276", "86", { stroke: "#FFD166" });
  line("284", "70", "284", "86", { stroke: "#FFD166" });
  line("284", "78", "344", "78", { stroke: "#FFD166" });
  svg.append(g);
  const labels: [string, string, string][] = [
    ["18", "64", "drive"],
    ["74", "104", "gap"],
    ["158", "98", "JJ"],
    ["198", "22", "C"],
    ["300", "64", "resonator"],
  ];
  for (const [x, y, value] of labels) {
    const node = svgEl("text", { x, y, fill: "#C5D0DC", "font-size": "12" });
    node.textContent = value;
    svg.append(node);
  }
  return svg;
}

function textNode(_value: string): Text {
  return document.createTextNode("");
}

function levelsSvg(): { svg: SVGSVGElement; highlight: SVGRectElement } {
  const svg = svgEl("svg", { viewBox: "0 0 360 250", role: "img" });
  const title = svgEl("title", {});
  title.textContent = "Qualitative anharmonic ladder with a smaller upper spacing.";
  svg.append(title);
  const yOf = (energy: number) => 214 - energy * 96;
  const highlight = svgEl("rect", {
    x: "78",
    y: String(yOf(1) - 16),
    width: "210",
    height: String(yOf(0) - yOf(1) + 32),
    fill: "none",
    stroke: "#9D4EDD",
    "stroke-dasharray": "4 3",
  });
  svg.append(highlight);
  LEVELS.forEach((level, index) => {
    const y = yOf(level.energy);
    const faint = index === 2;
    svg.append(
      svgEl("line", {
        x1: "90",
        x2: "270",
        y1: String(y),
        y2: String(y),
        stroke: faint ? "#6E5A86" : "#C9B6E4",
        "stroke-width": faint ? "1.2" : "2",
      }),
    );
    const label = svgEl("text", {
      x: "278",
      y: String(y + 4),
      fill: faint ? "#8E7AA6" : "#E4D7F7",
      "font-size": "14",
    });
    label.textContent = level.label;
    svg.append(label);
  });
  const e01 = LEVELS[1].energy - LEVELS[0].energy;
  const e12 = LEVELS[2].energy - LEVELS[1].energy;
  const brace = svgEl("text", { x: "24", y: "40", fill: "#C5D0DC", "font-size": "12" });
  brace.textContent = `Drawn spacing |1\u27e9\u2013|2\u27e9 ${e12.toFixed(2)} < |0\u27e9\u2013|1\u27e9 ${e01.toFixed(2)}`;
  svg.append(brace);
  return { svg, highlight };
}

function buildBlochSvg(): {
  svg: SVGSVGElement;
  arc: SVGPolylineElement;
  vector: SVGLineElement;
  playhead: SVGLineElement;
} {
  const svg = svgEl("svg", { viewBox: "0 0 280 250", role: "img" });
  const title = svgEl("title", {});
  title.textContent = "Bloch sphere viewed along +X. Rotation about +X runs from +Z toward \u2212Y.";
  svg.append(title);
  const cx = 140;
  const cy = 108;
  const r = 72;
  svg.append(svgEl("circle", { cx: String(cx), cy: String(cy), r: String(r), fill: "none", stroke: "#9D4EDD", "stroke-width": "1.4" }));
  svg.append(svgEl("line", { x1: String(cx - r), y1: String(cy), x2: String(cx + r), y2: String(cy), stroke: "#6E5A86", "stroke-width": "1" }));
  svg.append(svgEl("line", { x1: String(cx), y1: String(cy - r), x2: String(cx), y2: String(cy + r), stroke: "#6E5A86", "stroke-width": "1" }));
  svg.append(svgEl("circle", { cx: String(cx), cy: String(cy), r: "3.5", fill: "#E4D7F7" }));
  const arc = svgEl("polyline", { fill: "none", stroke: "#9D4EDD", "stroke-width": "2", points: "" });
  const vector = svgEl("line", {
    x1: String(cx),
    y1: String(cy),
    x2: String(cx),
    y2: String(cy - r),
    stroke: "#F4F1EA",
    "stroke-width": "2.2",
  });
  svg.append(arc, vector);
  const labels: [string, string, string][] = [
    [String(cx - 18), "22", "+Z |0\u27e9"],
    [String(cx - 22), "198", "\u2212Z |1\u27e9"],
    ["8", String(cy + 4), "\u2212Y"],
    ["228", String(cy + 4), "+Y"],
    [String(cx + 8), String(cy - 8), "+X"],
  ];
  for (const [x, y, value] of labels) {
    const node = svgEl("text", { x, y, fill: "#E4D7F7", "font-size": "11" });
    node.textContent = value;
    svg.append(node);
  }
  const spark = svgEl("polyline", {
    fill: "none",
    stroke: "#00E5FF",
    "stroke-width": "1.4",
    points: sparkPoints(),
  });
  spark.setAttribute("transform", "translate(40 214)");
  const playhead = svgEl("line", { x1: "0", x2: "0", y1: "-2", y2: "34", stroke: "#F4F1EA", "stroke-width": "1" });
  playhead.setAttribute("transform", "translate(40 214)");
  svg.append(spark, playhead);
  return { svg, arc, vector, playhead };
}

function sparkPoints(): string {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const u = i / 48;
    pts.push(`${(u * 200).toFixed(1)},${(32 - envelopeShape(u) * 28).toFixed(1)}`);
  }
  return pts.join(" ");
}

function arcPoints(theta: number): string {
  const cx = 140;
  const cy = 108;
  const r = 72;
  const steps = 28;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const th = theta * (i / steps);
    const y = -Math.sin(th);
    const z = Math.cos(th);
    pts.push(`${(cx + y * r).toFixed(2)},${(cy - z * r).toFixed(2)}`);
  }
  return pts.join(" ");
}

function tipPoint(theta: number): { x: string; y: string; spark: string } {
  const cx = 140;
  const cy = 108;
  const r = 72;
  const y = -Math.sin(theta);
  const z = Math.cos(theta);
  const u = theta / (Math.PI / 2);
  return {
    x: (cx + y * r).toFixed(2),
    y: (cy - z * r).toFixed(2),
    spark: (Math.min(1, Math.max(0, u)) * 200).toFixed(1),
  };
}

function alternatives(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "alts";
  wrap.append(waveCard(PANEL.alt0, ALT0.phase, ALT0.ampNorm));
  wrap.append(waveCard(PANEL.alt1, ALT1.phase, ALT1.ampNorm));
  return wrap;
}

function waveCard(label: string, phase: number, ampNorm: number): HTMLElement {
  const fig = document.createElement("figure");
  const svg = svgEl("svg", { viewBox: "0 0 160 42", role: "img" });
  const title = svgEl("title", {});
  title.textContent = label;
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const y = 21 - Math.sin(u * Math.PI * 3 + phase) * (6 + 8 * ampNorm);
    pts.push(`${(u * 150 + 4).toFixed(1)},${y.toFixed(1)}`);
  }
  svg.append(title, svgEl("polyline", { points: pts.join(" "), fill: "none", stroke: "#FFD166", "stroke-width": "1.4" }));
  const cap = document.createElement("figcaption");
  cap.textContent = label;
  fig.append(svg, cap);
  return fig;
}

function processingChain(): { list: HTMLOListElement; chip: HTMLLIElement; amp: HTMLLIElement; room: HTMLLIElement } {
  const list = document.createElement("ol");
  list.className = "chain";
  const chip = step(PANEL.stageChip);
  const amp = step(PANEL.stageAmp);
  const room = step(PANEL.stageRoom);
  list.append(chip, amp, room);
  return { list, chip, amp, room };
}

function step(text: string): HTMLLIElement {
  const li = document.createElement("li");
  const now = document.createElement("span");
  now.className = "now";
  now.textContent = "Now. ";
  now.hidden = true;
  li.append(now, document.createTextNode(text));
  return li;
}

function iqSvg(): { svg: SVGSVGElement; clouds: SVGGElement; boundary: SVGLineElement; shot: SVGGElement } {
  const svg = svgEl("svg", { viewBox: "0 0 360 340", role: "img" });
  const title = svgEl("title", {});
  title.textContent = "Synthetic I-Q plane. Reference clouds and one integrated record.";
  svg.append(title);
  const x0 = 52;
  const y0 = 16;
  const w = 250;
  const h = 230;
  const min = -2.7;
  const max = 2.7;
  const xi = (i: number) => x0 + ((i - min) / (max - min)) * w;
  const yq = (q: number) => y0 + ((max - q) / (max - min)) * h;
  svg.append(
    svgEl("line", { x1: String(x0), y1: String(y0 + h), x2: String(x0 + w), y2: String(y0 + h), stroke: "#C5D0DC" }),
    svgEl("line", { x1: String(x0), y1: String(y0), x2: String(x0), y2: String(y0 + h), stroke: "#C5D0DC" }),
  );
  const iLabel = svgEl("text", { x: "52", y: "268", fill: "#C5D0DC", "font-size": "11" });
  iLabel.textContent = PANEL.axisI;
  const qLabel = svgEl("text", { x: "8", y: "20", fill: "#C5D0DC", "font-size": "11" });
  qLabel.textContent = "Q";
  const qFull = svgEl("text", { x: "52", y: "286", fill: "#C5D0DC", "font-size": "11" });
  qFull.textContent = PANEL.axisQ;
  const units = svgEl("text", { x: "52", y: "304", fill: "#C5D0DC", "font-size": "11" });
  units.textContent = PANEL.units;
  svg.append(iLabel, qLabel, qFull, units);

  const clouds = svgEl("g", {});
  for (const point of CLOUD0) {
    clouds.append(svgEl("circle", {
      cx: xi(point.i).toFixed(1),
      cy: yq(point.q).toFixed(1),
      r: "2.2",
      fill: "none",
      stroke: "#D5DDE6",
    }));
  }
  for (const point of CLOUD1) {
    const s = 2.1;
    const x = xi(point.i);
    const y = yq(point.q);
    clouds.append(svgEl("rect", {
      x: (x - s).toFixed(1),
      y: (y - s).toFixed(1),
      width: String(s * 2),
      height: String(s * 2),
      fill: "none",
      stroke: "#FFD166",
    }));
  }
  const [a, b] = boundarySegment(2.4);
  const boundary = svgEl("line", {
    x1: xi(a.i).toFixed(1),
    y1: yq(a.q).toFixed(1),
    x2: xi(b.i).toFixed(1),
    y2: yq(b.q).toFixed(1),
    stroke: "#F4F1EA",
    "stroke-dasharray": "5 4",
    "stroke-width": "1.3",
  });
  const legend = svgEl("text", { x: "52", y: "322", fill: "#C5D0DC", "font-size": "11" });
  legend.textContent = "Circles |0\u27e9 refs \u00b7 squares |1\u27e9 refs \u00b7 dashed synthetic boundary";
  svg.append(clouds, boundary, legend);

  const shot = svgEl("g", {});
  const sx = xi(SHOT.i);
  const sy = yq(SHOT.q);
  const diamond = svgEl("polygon", {
    points: `${sx},${sy - 7} ${sx + 6},${sy} ${sx},${sy + 7} ${sx - 6},${sy}`,
    fill: "#F4F1EA",
    stroke: "#090E17",
  });
  const shotLabel = svgEl("text", { x: String(sx + 10), y: String(sy - 8), fill: "#F4F1EA", "font-size": "11" });
  shotLabel.textContent = "One synthetic shot.";
  shot.append(diamond, shotLabel);
  svg.append(shot);
  clouds.setAttribute("opacity", "0");
  boundary.setAttribute("opacity", "0");
  shot.setAttribute("opacity", "0");
  return { svg, clouds, boundary, shot };
}
