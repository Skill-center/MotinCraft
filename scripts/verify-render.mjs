#!/usr/bin/env node
// verify-render.mjs — machine checks for a rendered Remotion video.
// This is the MACHINE half of verification (see SKILL.md §Verify). It can never
// replace the visual pass, but it catches the silent failures: no audio, wrong
// duration, blank/still frames, stale files.
//
// Usage:
//   node scripts/verify-render.mjs out/video.mp4 \
//     [--expect-audio] [--duration 5.0] [--fps 30] \
//     [--stills out/f020.png,out/f070.png,out/f120.png]
//
// Exit code 1 if anything FAILs. If ffmpeg is missing, only the filesystem checks
// run and the report says so — install ffmpeg or set FFMPEG=/path/to/ffmpeg.
import {existsSync, readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";

const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--"));
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
if (!video) {
  console.error("usage: verify-render.mjs <video.mp4> [--expect-audio] [--duration s] [--fps n] [--stills a.png,b.png]");
  process.exit(2);
}

const EXPECT_DUR = opt("duration");
const EXPECT_FPS = opt("fps");
const EXPECT_AUDIO = flag("expect-audio");
const STILLS = (opt("stills") ?? "").split(",").filter(Boolean);

const ffmpeg =
  process.env.FFMPEG || (() => {
    const r = spawnSync("which", ["ffmpeg"], {encoding: "utf8"});
    return r.status === 0 ? r.stdout.trim() : null;
  })();

const results = []; // {name, ok, detail}
const report = (name, ok, detail) => results.push({name, ok, detail});

// ---------- 1. file sanity ----------
report("video exists", existsSync(video), video);
if (existsSync(video)) {
  const size = readFileSync(video).length;
  report("file size > 40 KB", size > 40_000, `${(size / 1024).toFixed(0)} KB`);
}

// ---------- 2. container probes (ffmpeg -i stderr) ----------
let probe = "";
if (ffmpeg) {
  const r = spawnSync(ffmpeg, ["-i", video], {encoding: "utf8"});
  probe = r.stderr || "";
  const durMatch = probe.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  const hasVideo = /Stream #.*Video:/.test(probe);
  const audioStreams = (probe.match(/Stream #.*Audio:/g) ?? []).length;
  const fpsMatch = probe.match(/(\d+(?:\.\d+)?)\s*fps/);

  report("container parses (video stream)", hasVideo, "");
  if (EXPECT_DUR && durMatch) {
    const s = (+durMatch[1]) * 3600 + (+durMatch[2]) * 60 + (+durMatch[3]);
    report(
      "duration matches",
      Math.abs(s - Number(EXPECT_DUR)) <= 0.6,
      `got ${s.toFixed(2)}s, expected ${EXPECT_DUR}s (±0.6s)`,
    );
  } else if (EXPECT_DUR && !durMatch) {
    report("duration matches", false, "could not read duration");
  }
  if (EXPECT_FPS && fpsMatch) {
    const f = Number(fpsMatch[1]);
    report("fps matches", Math.abs(f - Number(EXPECT_FPS)) <= 1.5, `got ${f}, expected ${EXPECT_FPS}`);
  }
  if (EXPECT_AUDIO) {
    report("audio stream present", audioStreams >= 1, `${audioStreams} audio stream(s)`);
  }
}

// ---------- 3. stills: not blank, not flat, not identical to each other ----------
if (ffmpeg) {
  const stats = [];
  for (const p of STILLS) {
    if (!existsSync(p)) {
      report(`still exists ${p}`, false, "");
      continue;
    }
    // Decode to 8x8 RGB and compute statistics in JS — no stderr parsing to depend on.
    const r = spawnSync(
      ffmpeg,
      ["-v", "error", "-i", p, "-vf", "scale=8:8", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
      {encoding: "buffer", maxBuffer: 1 << 20},
    );
    if (r.status !== 0 || !r.stdout || r.stdout.length !== 8 * 8 * 3) {
      report(`still decodes ${p}`, false, "");
      continue;
    }
    const b = r.stdout;
    let sum = 0;
    let sumSq = 0;
    let min = 255;
    let max = 0;
    for (let i = 0; i < b.length; i++) {
      sum += b[i];
      sumSq += b[i] * b[i];
      if (b[i] < min) min = b[i];
      if (b[i] > max) max = b[i];
    }
    const n = b.length;
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
    const hash = createHash("sha256").update(b).digest("hex").slice(0, 12);
    stats.push({p, mean, std, min, max, hash});
    report(`still not blank ${p.split("/").pop()}`, mean > 8 && mean < 248, `mean ${mean.toFixed(1)}`);
    report(`still not flat ${p.split("/").pop()}`, std >= 2, `stddev ${std.toFixed(1)}`);
  }
  for (let i = 1; i < stats.length; i++) {
    const a = stats[i - 1];
    const c = stats[i];
    report(
      `stills differ ${a.p.split("/").pop()} vs ${c.p.split("/").pop()}`,
      a.hash !== c.hash,
      `${a.hash} vs ${c.hash}`,
    );
  }
  // Color presence: --colors "f070.png=#7C3AED:300,f130.png=#7C3AED:60"
  // Counts pixels within COLOR_TOL of the target in a 160px-wide decode and requires
  // >= minPixels. Catches "brand never rendered" regressions cheaply.
  const colors = (opt("colors") ?? "").split(",").filter(Boolean);
  const COLOR_TOL = 110;
  for (const entry of colors) {
    const [pathPart, spec] = [entry.slice(0, entry.lastIndexOf("=")), entry.slice(entry.lastIndexOf("=") + 1)];
    const m = /^#?([0-9A-Fa-f]{6}):(\d+)$/.exec(spec ?? "");
    if (!m) {
      report(`colors entry ${entry}`, false, "expected file=#RRGGBB:minPixels");
      continue;
    }
    const tr = parseInt(m[1].slice(0, 2), 16);
    const tg = parseInt(m[1].slice(2, 4), 16);
    const tb = parseInt(m[1].slice(4, 6), 16);
    const minPixels = Number(m[2]);
    if (!existsSync(pathPart)) {
      report(`color still exists ${pathPart}`, false, "");
      continue;
    }
    const r = spawnSync(
      ffmpeg,
      ["-v", "error", "-i", pathPart, "-vf", "scale=160:-2", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
      {encoding: "buffer", maxBuffer: 1 << 22},
    );
    if (r.status !== 0 || !r.stdout || r.stdout.length === 0) {
      report(`color decode ${pathPart}`, false, "");
      continue;
    }
    const b = r.stdout;
    let hits = 0;
    for (let i = 0; i + 2 < b.length; i += 3) {
      const d = Math.hypot(b[i] - tr, b[i + 1] - tg, b[i + 2] - tb);
      if (d <= COLOR_TOL) hits++;
    }
    report(
      `color present ${pathPart.split("/").pop()} ${m[1]}`,
      hits >= minPixels,
      `${hits} px >= ${minPixels} px`,
    );
  }
} else if (STILLS.length) {
  report("ffmpeg available for still checks", false, "install ffmpeg or set FFMPEG=...");
}

// ---------- summary ----------
let fails = 0;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) fails++;
  console.log(`${mark.padEnd(4)}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
}
console.log(fails === 0 ? "\nAll machine checks passed." : `\n${fails} machine check(s) FAILED.`);
process.exit(fails === 0 ? 0 : 1);
