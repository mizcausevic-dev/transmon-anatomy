import { BARRIER, METALS, SUBSTRATE } from "./layout";

export function mountFallback(root: HTMLElement): void {
  root.innerHTML = "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "-4.3 -2.8 8.6 5.5");
  svg.setAttribute("role", "img");
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = "Top view of the representative transmon layout. Electrodes meet only at the junction barrier. Drive, resonator, and feedline stay separated by gaps.";
  svg.append(title);
  const sub = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  sub.setAttribute("x", String(SUBSTRATE.x0));
  sub.setAttribute("y", String(-SUBSTRATE.y1));
  sub.setAttribute("width", String(SUBSTRATE.x1 - SUBSTRATE.x0));
  sub.setAttribute("height", String(SUBSTRATE.y1 - SUBSTRATE.y0));
  sub.setAttribute("fill", "#24344B");
  svg.append(sub);
  for (const rect of METALS) {
    svg.append(rectEl(rect.x0, rect.y0, rect.x1, rect.y1, "#A7B3C2"));
  }
  svg.append(rectEl(BARRIER.x0, BARRIER.y0, BARRIER.x1, BARRIER.y1, "#6B5E54"));
  root.append(svg);
  const p = document.createElement("p");
  p.className = "note";
  p.textContent = "Representative hardware—not a fabrication layout. Static map used because WebGL did not start. The timeline still drives the calculated diagrams.";
  root.append(p);
}

function rectEl(x0: number, y0: number, x1: number, y1: number, fill: string): SVGRectElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  node.setAttribute("x", String(x0));
  node.setAttribute("y", String(-y1));
  node.setAttribute("width", String(x1 - x0));
  node.setAttribute("height", String(y1 - y0));
  node.setAttribute("fill", fill);
  return node;
}
