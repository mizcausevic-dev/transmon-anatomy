import { Score } from "./audio";
import { CALLOUT_TEXT } from "./copy";
import { mountDiagrams } from "./diagrams";
import { mountFallback } from "./fallback";
import { ANCHORS, type CalloutId } from "./layout";
import { present } from "./present";
import { createScene, type SceneApi } from "./scene";
import { DURATION, formatTime, frameIndex, shotAt } from "./timeline";

const app = document.querySelector("#app") as HTMLElement;
const canvas = document.querySelector("#view") as HTMLCanvasElement;
const calloutLayer = document.querySelector("#callouts") as HTMLElement;
const fallbackRoot = document.querySelector("#fallback") as HTMLElement;
const gate = document.querySelector("#gate") as HTMLElement;
const statusEl = document.querySelector("#status") as HTMLParagraphElement;
const diagramsRoot = document.querySelector("#diagrams") as HTMLElement;
const playBtn = document.querySelector("#play") as HTMLButtonElement;
const startBtn = document.querySelector("#start") as HTMLButtonElement;
const replayBtn = document.querySelector("#replay") as HTMLButtonElement;
const timeline = document.querySelector("#timeline") as HTMLInputElement;
const clock = document.querySelector("#clock") as HTMLElement;
const frameEl = document.querySelector("#frame") as HTMLElement;
const muteBtn = document.querySelector("#mute") as HTMLButtonElement;
const musicInput = document.querySelector("#music") as HTMLInputElement;
const sfxInput = document.querySelector("#sfx") as HTMLInputElement;
const motionBtn = document.querySelector("#motion") as HTMLButtonElement;
const fullBtn = document.querySelector("#full") as HTMLButtonElement;
const live = document.querySelector("#live") as HTMLElement;

const diagrams = mountDiagrams(diagramsRoot);
const score = new Score();
let scene: SceneApi | null = null;
let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let playing = false;
let pausedAt = 0;
let origin = 0;
let raf = 0;
let shotSpoken = "";
let qualitySamples = 0;
let qualitySum = 0;
let qualityDropped = false;
let lastFrameAt = performance.now();

const calloutNodes = new Map<CalloutId, HTMLDivElement>();
for (const id of Object.keys(CALLOUT_TEXT) as CalloutId[]) {
  const el = document.createElement("div");
  el.className = "callout";
  el.textContent = CALLOUT_TEXT[id];
  el.hidden = true;
  calloutLayer.append(el);
  calloutNodes.set(id, el);
}

function currentTime(): number {
  if (!playing) return pausedAt;
  return Math.min(DURATION, (performance.now() - origin) / 1000);
}

function renderAt(t: number): void {
  if (scene) {
    scene.update(t, reduced);
    scene.render();
  }
  diagrams.update(t, reduced);
  timeline.value = String(t);
  clock.textContent = `${formatTime(t)} / 00:34.000`;
  const frame = frameIndex(t);
  const shot = shotAt(t);
  frameEl.textContent = `frame ${frame} · ${shot.name}`;
  timeline.setAttribute("aria-valuetext", `${formatTime(t)}, ${shot.name}, frame ${frame}`);
  if (scene) {
    const active = new Set(present(t).callouts.map((item) => item.id));
    for (const [id, el] of calloutNodes) {
      const point = scene.project(ANCHORS[id]);
      const show = point.visible && active.has(id);
      el.hidden = !show;
      if (show) {
        el.style.left = `${Math.min(canvas.clientWidth - 8, Math.max(8, point.x))}px`;
        el.style.top = `${Math.min(canvas.clientHeight - 8, Math.max(8, point.y))}px`;
      }
    }
  }
  if (shot.name !== shotSpoken) {
    shotSpoken = shot.name;
    live.textContent = `${shot.name}. ${formatTime(t)}.`;
  }
  score.sync(t, playing);
}

function loop(): void {
  const now = performance.now();
  const dt = now - lastFrameAt;
  lastFrameAt = now;
  if (playing && !qualityDropped && scene) {
    qualitySamples += 1;
    qualitySum += dt;
    if (qualitySamples >= 40 && qualitySum / qualitySamples > 38) {
      qualityDropped = true;
      scene.setQuality("low");
    }
  }
  const t = currentTime();
  renderAt(t);
  if (playing && t >= DURATION) {
    playing = false;
    pausedAt = DURATION;
    playBtn.textContent = "Play";
    playBtn.setAttribute("aria-pressed", "false");
    void score.pause();
    return;
  }
  if (playing) raf = requestAnimationFrame(loop);
}

async function playFrom(t: number): Promise<void> {
  pausedAt = Math.min(DURATION, Math.max(0, t));
  if (pausedAt >= DURATION) pausedAt = 0;
  origin = performance.now() - pausedAt * 1000;
  playing = true;
  gate.hidden = true;
  playBtn.textContent = "Pause";
  playBtn.setAttribute("aria-pressed", "true");
  try {
    await score.start();
  } catch (error) {
    statusEl.textContent = "Audio did not start. The picture still runs.";
    console.error(error);
  }
  score.seek(pausedAt);
  cancelAnimationFrame(raf);
  lastFrameAt = performance.now();
  raf = requestAnimationFrame(loop);
}

function pause(): void {
  pausedAt = currentTime();
  playing = false;
  cancelAnimationFrame(raf);
  playBtn.textContent = "Play";
  playBtn.setAttribute("aria-pressed", "false");
  void score.pause();
  renderAt(pausedAt);
}

function seek(t: number): void {
  const next = Math.min(DURATION, Math.max(0, t));
  pausedAt = next;
  if (playing) origin = performance.now() - next * 1000;
  score.seek(next);
  renderAt(next);
}

function toggle(): void {
  if (playing) pause();
  else void playFrom(currentTime());
}

playBtn.addEventListener("click", toggle);
startBtn.addEventListener("click", () => void playFrom(currentTime()));
replayBtn.addEventListener("click", () => void playFrom(0));
timeline.addEventListener("input", () => {
  seek(Number(timeline.value));
});
muteBtn.addEventListener("click", () => {
  const muted = muteBtn.getAttribute("aria-pressed") !== "true";
  muteBtn.setAttribute("aria-pressed", String(muted));
  muteBtn.textContent = muted ? "Unmute" : "Mute";
  score.setMuted(muted);
});
musicInput.addEventListener("input", () => score.setMusic(Number(musicInput.value)));
sfxInput.addEventListener("input", () => score.setSfx(Number(sfxInput.value)));
motionBtn.addEventListener("click", () => {
  reduced = !reduced;
  motionBtn.setAttribute("aria-pressed", String(reduced));
  document.documentElement.classList.toggle("reduced", reduced);
  renderAt(currentTime());
});
fullBtn.addEventListener("click", () => {
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) void document.exitFullscreen();
  else void app.requestFullscreen();
});
document.querySelectorAll<HTMLButtonElement>("[data-shot]").forEach((button) => {
  button.addEventListener("click", () => seek(Number(button.dataset.shot)));
});

window.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName ?? "";
  if (event.code === "Space") {
    if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return;
    event.preventDefault();
    toggle();
    return;
  }
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (event.code === "ArrowRight") {
    event.preventDefault();
    seek(currentTime() + (event.shiftKey ? 0.1 : 1));
  } else if (event.code === "ArrowLeft") {
    event.preventDefault();
    seek(currentTime() - (event.shiftKey ? 0.1 : 1));
  } else if (event.code === "Home") {
    seek(0);
  } else if (event.code === "End") {
    seek(DURATION);
  } else if (event.code === "KeyM") {
    muteBtn.click();
  } else if (event.code === "KeyR") {
    replayBtn.click();
  } else if (event.code === "KeyF") {
    fullBtn.click();
  } else if (event.code >= "Digit1" && event.code <= "Digit5") {
    const index = Number(event.code.slice(5)) - 1;
    const button = document.querySelectorAll<HTMLButtonElement>("[data-shot]")[index];
    button?.click();
  }
});

window.addEventListener("resize", () => {
  scene?.resize();
  renderAt(currentTime());
});

if (!document.fullscreenEnabled) fullBtn.hidden = true;

if (reduced) {
  motionBtn.setAttribute("aria-pressed", "true");
  document.documentElement.classList.add("reduced");
}

try {
  scene = createScene(canvas);
  scene.update(0, reduced);
  scene.render();
  statusEl.textContent = "";
} catch (error) {
  console.error(error);
  canvas.hidden = true;
  statusEl.textContent = "WebGL is unavailable. The static hardware map is the fallback. Diagrams and the timeline still run.";
  mountFallback(fallbackRoot);
}

renderAt(0);
