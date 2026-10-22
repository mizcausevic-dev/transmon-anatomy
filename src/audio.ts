import { controlAt } from "./model/control";

type Cue = {
  t: number;
  freq: number;
  dur: number;
  gain: number;
  type: OscillatorType;
};

const CUES: Cue[] = [
  { t: 1.15, freq: 392, dur: 0.42, gain: 0.028, type: "sine" },
  { t: 6.55, freq: 466, dur: 0.26, gain: 0.022, type: "sine" },
  { t: 7.45, freq: 587, dur: 0.3, gain: 0.018, type: "triangle" },
  { t: 11.05, freq: 349, dur: 0.2, gain: 0.016, type: "sine" },
  { t: 11.42, freq: 440, dur: 0.2, gain: 0.016, type: "sine" },
  { t: 11.8, freq: 523, dur: 0.26, gain: 0.015, type: "sine" },
  { t: 29.25, freq: 311, dur: 0.36, gain: 0.018, type: "sine" },
  { t: 32.8, freq: 392, dur: 0.5, gain: 0.026, type: "triangle" },
];

function bedLevel(t: number): number {
  if (t <= 0 || t >= 34) return 0;
  let level = 1;
  if (t < 0.7) level = t / 0.7;
  if (t > 33.15) level = Math.max(0, (34 - t) / 0.85);
  return level;
}

export class Score {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private control: GainNode | null = null;
  private drones: OscillatorNode[] = [];
  private liveSfx: OscillatorNode[] = [];
  private lastT = 0;
  private musicLevel = 0.7;
  private sfxLevel = 0.8;
  private muted = false;

  get ready(): boolean {
    return this.ctx !== null;
  }

  async start(): Promise<void> {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) this.build(new Ctx());
    if (this.ctx && this.ctx.state !== "running") await this.ctx.resume();
  }

  async pause(): Promise<void> {
    if (this.ctx && this.ctx.state === "running") await this.ctx.suspend();
  }

  seek(t: number): void {
    this.stopSfx();
    this.lastT = t;
    this.apply(t);
  }

  sync(t: number, playing: boolean): void {
    if (!this.ctx || !playing) return;
    const prev = this.lastT;
    this.apply(t);
    if (t > prev && t - prev < 0.3) {
      for (const cue of CUES) {
        if (cue.t > prev && cue.t <= t) this.blip(cue);
      }
    }
    this.lastT = t;
  }

  setMusic(level: number): void {
    this.musicLevel = level;
    if (this.music && this.ctx) this.music.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
  }

  setSfx(level: number): void {
    this.sfxLevel = level;
    if (this.sfx && this.ctx) this.sfx.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  private build(ctx: AudioContext): void {
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);
    this.master = master;

    const music = ctx.createGain();
    music.gain.value = this.musicLevel;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.6;
    music.connect(filter);
    filter.connect(master);
    this.music = music;

    const sfx = ctx.createGain();
    sfx.gain.value = this.sfxLevel;
    sfx.connect(master);
    this.sfx = sfx;

    const control = ctx.createGain();
    control.gain.value = 0;
    control.connect(music);
    this.control = control;

    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.value = 293.66;
    tone.connect(control);
    tone.start();
    this.drones.push(tone);

    const partials: { freq: number; gain: number; type: OscillatorType }[] = [
      { freq: 73.42, gain: 0.045, type: "sine" },
      { freq: 110, gain: 0.03, type: "sine" },
      { freq: 146.83, gain: 0.018, type: "triangle" },
      { freq: 174.61, gain: 0.01, type: "sine" },
    ];
    for (const partial of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = partial.type;
      osc.frequency.value = partial.freq;
      gain.gain.value = partial.gain;
      osc.connect(gain);
      gain.connect(music);
      osc.start();
      this.drones.push(osc);
    }
  }

  private apply(t: number): void {
    if (!this.ctx || !this.music || !this.control) return;
    const now = this.ctx.currentTime;
    const bed = bedLevel(t);
    this.music.gain.setTargetAtTime(this.musicLevel * bed, now, 0.08);
    const env = controlAt(t).envelope;
    this.control.gain.setTargetAtTime(env * 0.055, now, 0.03);
  }

  private blip(cue: Cue): void {
    if (!this.ctx || !this.sfx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = cue.type;
    osc.frequency.value = cue.freq;
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(Math.max(cue.gain, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + cue.dur);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(now);
    osc.stop(now + cue.dur + 0.02);
    this.liveSfx.push(osc);
    osc.onended = () => {
      this.liveSfx = this.liveSfx.filter((node) => node !== osc);
    };
  }

  private stopSfx(): void {
    for (const osc of this.liveSfx) {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    }
    this.liveSfx = [];
  }
}
