#!/usr/bin/env node
// synth-music.mjs — deterministic music bed as mono 16-bit 44.1 kHz WAV.
// A structured generator, not a wallpaper loop: it arranges a chord progression,
// bass, kick/hats and a pad into bars, so the result has a beat grid your cuts can
// lock to (framesPerBeat = fps * 60 / bpm). Fully seeded — byte-identical output for
// the same arguments. It is a functional sketch generator, NOT a composer: treat it
// as a placeholder bed until the user supplies real music.
//
// Usage:
//   node scripts/synth-music.mjs <outFile> [bpm] [seconds] [rootMidi] [seed]
//   node scripts/synth-music.mjs public/sfx/track.wav 120 8 45 20260908
//
// rootMidi is the key root (69 = A4, 45 = A2). Progression: Am → F → C → G (i–VI–III–VII
// in A minor) cycled per bar; the 5s "sting" variant works fine with 1–2 bars.
import {writeFileSync, mkdirSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const SR = 44100;
const OUT = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sfx", "track.wav");
const BPM = Number(process.argv[3] ?? 120);
const SECS = Number(process.argv[4] ?? 8);
const ROOT = Number(process.argv[5] ?? 45); // A2
const SEED = Number(process.argv[6] ?? 20260908);
mkdirSync(dirname(OUT), {recursive: true});

const mulberry32 = (seed) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const rand = mulberry32(SEED);
const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// A minor i–VI–III–VII: [Am, F, C, G] as (root offset, is-major) per bar.
const PROG = [
  {root: 0, major: false},
  {root: -4, major: true},
  {root: 3, major: true},
  {root: -2, major: true},
];
const barT = (60 / BPM) * 4; // seconds per 4-beat bar
const beatT = 60 / BPM;
const eighthT = beatT / 2;

const beats = Math.max(4, Math.round((SECS * BPM) / 60));
const totalT = beats * beatT;
const bars = Math.ceil(beats / 4);
const N = Math.round(totalT * SR);
const out = new Float32Array(N);

const add = (start, dur, fn) => {
  const s0 = Math.max(0, Math.floor(start * SR));
  const n = Math.floor(dur * SR);
  for (let i = 0; i < n && s0 + i < N; i++) out[s0 + i] += fn(i / SR, i / n);
};

// one-pole lowpass helper
const lp = (x, prev, c) => prev + c * (x - prev);

// ── pad: per-bar chord triads with crossfaded windows ─────────────────────────────
const chordTones = (barIdx) => {
  const p = PROG[barIdx % PROG.length];
  const r = ROOT + p.root;
  const third = p.major ? 4 : 3;
  return [r, r + third, r + 7, r + 12];
};
{
  const fade = 0.6; // seconds of crossfade between chord changes
  const peak = 0.5 / 4; // per-tone amplitude (4 tones, keep headroom)
  for (let b = 0; b < bars; b++) {
    const b0 = b * barT - fade;
    const b1 = (b + 1) * barT + fade;
    for (const m of chordTones(b)) {
      const f = midiFreq(m);
      let phase = rand() * Math.PI * 2;
      const det = 1 + 0.0012 * (rand() - 0.5); // stable detune for THIS voice —
      // one roll per voice, NOT per sample: rolling inside the loop turns the pad
      // into random-FM noise (a real bug found in review; fixed and re-verified).
      const s0 = Math.max(0, Math.floor(b0 * SR));
      const e1 = Math.min(N - 1, Math.floor(b1 * SR));
      for (let i = s0; i < e1; i++) {
        const t = i / SR;
        if (t < b0 || t > b1) continue;
        // raised-cosine window, 1 inside the bar, 0 at ±fade
        let w = 1;
        if (t < b * barT) w = 0.5 * (1 - Math.cos((Math.PI * (t - b0)) / fade));
        else if (t > (b + 1) * barT)
          w = 0.5 * (1 - Math.cos((Math.PI * (b1 - t)) / fade));
        phase += (2 * Math.PI * f * det) / SR;
        out[i] += Math.sin(phase) * w * peak * 0.85;
      }
    }
  }
}

// ── bass: 8th-note roots from bar 1; octave pop on the last eighth of each bar ────
{
  const startBeat = Math.min(4, Math.max(1, Math.floor(beats * 0.15)));
  for (let e = 0; e < beats * 2; e++) {
    const t = e * eighthT;
    if (t < startBeat * beatT || t >= totalT - 0.05) continue;
    const bar = Math.floor(t / barT);
    const root = ROOT + PROG[bar % PROG.length].root;
    const isLastEighth = Math.abs((t % barT) - (barT - eighthT)) < 0.001;
    const m = root + (isLastEighth ? 12 : 0);
    const f = midiFreq(m);
    const dur = 0.24;
    add(t, dur, (ts, _p) => {
      const amp = 0.34 * Math.exp(-ts * 16);
      return Math.sin(2 * Math.PI * f * ts) * amp + Math.sin(2 * Math.PI * f * 2 * ts) * amp * 0.3;
    });
  }
}

// ── drums: kick (beats), hats (offbeat 8ths) — sparse arrangement ───────────────
// Round-4 review: the drums entered too early for a short sting, making the bed
// feel busy under the SFX. Now the groove builds: pad+bass alone for the first
// beats, kick from beat 3 (lands exactly on a 1.5 s scene cut at 120 BPM), hats one
// beat later.
{
  const startKick = beats >= 16 ? 8 : beats >= 10 ? 3 : beats >= 8 ? 2 : 0;
  const hatStart = Math.min(6, Math.max(2, Math.round(beats * 0.4))); // 10→4 (t=2.0 s)
  let hatPrev = 0;
  for (let i = 0; i < beats; i++) {
    const t = i * beatT;
    if (t >= totalT - 0.05) continue;
    if (i >= startKick) {
      // kick: pitch-dropping sine + click
      add(t, 0.3, (ts, _p) => {
        const f = 130 - 90 * Math.min(1, ts * 9);
        const click = Math.sin(2 * Math.PI * 1800 * ts) * Math.exp(-ts * 90) * 0.08;
        return Math.sin(2 * Math.PI * f * ts) * Math.exp(-ts * 7) * 0.85 + click;
      });
    }
    // offbeat hat (i + 0.5 beat) from hatStart
    const ht = t + beatT / 2;
    if (ht < totalT - 0.02 && i >= hatStart) {
      const s0 = Math.floor(ht * SR);
      const hn = Math.floor(0.05 * SR);
      for (let j = 0; j < hn && s0 + j < N; j++) {
        const ts = j / SR;
        hatPrev = lp(rand() * 2 - 1, hatPrev, 0.8);
        out[s0 + j] += hatPrev * Math.exp(-ts * 160) * 0.4;
      }
    }
  }
}

// ── master: fade-in 60 ms, fade-out last 0.4 s, normalize to peak 0.8 ─────────────
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
const g = 0.8 / Math.max(1e-9, peak);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fin = Math.min(1, t / 0.06);
  const fout = Math.min(1, (totalT - t) / 0.4);
  out[i] *= g * fin * Math.max(0, fout);
}

const buf = Buffer.alloc(44 + N * 2);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 2, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(out[i] * 32767), 44 + i * 2);
writeFileSync(OUT, buf);
console.log(
  `track.wav written: ${(totalT).toFixed(2)} s @ ${BPM} BPM, ${beats} beats, ${bars} bar(s), root midi ${ROOT}, seed ${SEED}`,
);
