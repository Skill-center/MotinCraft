#!/usr/bin/env node
// synth-sfx.mjs — deterministic SFX kit as mono 16-bit 44.1 kHz WAVs.
// No network, no asset files, no Math.random/Date: the PRNG is seeded, so the same
// arguments always produce byte-identical output (verified by design — run twice and
// compare hashes if you ever doubt it).
//
// Usage:
//   node scripts/synth-sfx.mjs <outputDir> [padSeconds]
//   node scripts/synth-sfx.mjs public/sfx 16
//
// Kit (all deterministic):
//   whoosh    0.40 s  noise sweep   — entrances, transitions
//   riser     1.00 s  rising energy — build into a HIT (start 2–3 frames early)
//   pop       0.14 s  pitch-drop    — UI pops, chip landings
//   tick      0.05 s  high blip     — counters (default tick)
//   tick2     0.05 s  higher blip   — counters (alternate, avoids machine-gun)
//   bass      0.45 s  low thump     — hits ON cuts/beats
//   impact    0.90 s  layered hit   — payoff moments (sub + noise + slap)
//   shimmer   0.80 s  high sparkle  — reveals, logo glints
//   pad<N>    N s     warm pad      — bed exactly N seconds (drone + slow movement)
import {writeFileSync, mkdirSync} from "node:fs";
import {join} from "node:path";

const SR = 44100;
const OUT_DIR = process.argv[2] ?? "public/sfx";
const PAD_S = Number(process.argv[3] ?? 16);
mkdirSync(OUT_DIR, {recursive: true});

// mulberry32 — small deterministic PRNG.
const mulberry32 = (seed) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const rand = mulberry32(20260908); // fixed seed — reproducible across runs/machines

const secs = (n) => Math.round(n * SR);

function wav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}
const write = (name, samples) => writeFileSync(join(OUT_DIR, name), wav(samples));

// A tiny one-pole lowpass in a closure — keeps filter code out of the loops.
const lowpass = (init = 0) => {
  let lp = init;
  return (x, cutoff) => {
    lp += cutoff * (x - lp);
    return lp;
  };
};

// whoosh — noise burst with rising-then-falling lowpass sweep, 0.40 s
{
  const N = secs(0.4);
  const out = new Float32Array(N);
  const lp = lowpass();
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const env = Math.sin(Math.PI * Math.pow(t, 0.7)) ** 2;
    const cutoff = 0.05 + 0.25 * Math.sin(Math.PI * t);
    out[i] = lp(rand() * 2 - 1, cutoff) * env * 0.9;
  }
  write("whoosh.wav", out);
}

// riser — 1.00 s: noise + lowpass opening + rising sine, peak at the very end.
// Start it ~3 frames before the HIT it points at.
{
  const N = secs(1.0);
  const out = new Float32Array(N);
  const lp = lowpass();
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const env = Math.pow(t, 1.6); // late swell
    const cutoff = 0.04 + 0.5 * t * t; // filter opens upward
    const n = lp(rand() * 2 - 1, cutoff) * env * 0.5;
    const f = 180 + 540 * t * t; // rising tone underneath
    phase += (2 * Math.PI * f) / SR;
    out[i] = n + Math.sin(phase) * env * 0.22;
  }
  write("riser.wav", out);
}

// pop — short pitch-dropping sine, 0.14 s
{
  const N = secs(0.14);
  const out = new Float32Array(N);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    phase += (2 * Math.PI * (700 - 380 * t)) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t * 9) * 0.8;
  }
  write("pop.wav", out);
}

// tick — high blip, 0.05 s (counters)
const makeTick = (f0) => {
  const N = secs(0.05);
  const out = new Float32Array(N);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    phase += (2 * Math.PI * f0) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t * 15) * 0.5;
  }
  return out;
};
write("tick.wav", makeTick(1900));
write("tick2.wav", makeTick(2650)); // alternate pitch — alternate ticks while counting

// bass — low sine thump, 0.45 s (hits on cuts/beats)
{
  const N = secs(0.45);
  const out = new Float32Array(N);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    phase += (2 * Math.PI * (85 - 25 * t)) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t * 6) * 0.95;
  }
  write("bass.wav", out);
}

// impact — 0.90 s layered hit for payoff moments: sub drop + filtered noise slap.
{
  const N = secs(0.9);
  const out = new Float32Array(N);
  const lp = lowpass();
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    phase += (2 * Math.PI * (150 - 95 * Math.min(1, t * 6))) / SR;
    const sub = Math.sin(phase) * Math.exp(-t * 5.5) * 0.95;
    const slap = lp(rand() * 2 - 1, 0.3) * Math.exp(-t * 9) * 0.4;
    out[i] = sub + slap;
  }
  write("impact.wav", out);
}

// shimmer — 0.80 s: three high partials + air, for logo glints and reveals.
{
  const N = secs(0.8);
  const out = new Float32Array(N);
  const partials = [
    {f: 2093, t0: 0.0, a: 0.22},
    {f: 2637, t0: 0.06, a: 0.16},
    {f: 3136, t0: 0.12, a: 0.12},
  ];
  const lp = lowpass();
  for (const {f, t0, a} of partials) {
    let ph = 0;
    const s0 = secs(t0);
    for (let i = s0; i < N; i++) {
      const t = (i - s0) / (N - s0);
      ph += (2 * Math.PI * f) / SR;
      out[i] += Math.sin(ph) * Math.exp(-t * 5) * a;
    }
  }
  for (let i = 0; i < N; i++) {
    const t = i / N;
    out[i] += lp(rand() * 2 - 1, 0.12) * Math.exp(-t * 8) * 0.06; // air
  }
  write("shimmer.wav", out);
}

// pad — warm detuned A-major drone with slow tremolo, exactly PAD_S seconds.
// Pure additive (no noise) so it can play underneath everything without hiss.
{
  const N = secs(PAD_S);
  const out = new Float32Array(N);
  const freqs = [110, 164.81, 220, 277.18]; // A2 E3 A3 C#4
  const detune = 1.0015;
  for (const f of freqs) {
    for (const d of [f / detune, f * detune]) {
      let phase = rand() * Math.PI * 2;
      for (let i = 0; i < N; i++) {
        phase += (2 * Math.PI * d) / SR;
        out[i] += Math.sin(phase);
      }
    }
  }
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const attack = Math.min(1, t / 1.6);
    const release = Math.min(1, (PAD_S - t) / 2.2);
    const trem = 1 - 0.18 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.13 * t));
    out[i] *= (0.5 / (freqs.length * 2)) * attack * release * trem;
  }
  write(`pad${PAD_S}.wav`, out);
}

console.log(
  `SFX written to ${OUT_DIR}: whoosh, riser, pop, tick, tick2, bass, impact, shimmer, pad${PAD_S}`,
);
