#!/usr/bin/env node
// storyboard.mjs — contact sheet of N evenly spaced frames from a video.
// One image the reviewer (model or user) can scan in seconds; the cheapest way to
// approve pacing before the final visual pass.
//
// Usage:
//   node scripts/storyboard.mjs <video.mp4> [out.png] [intervalSeconds] [cols]
//   node scripts/storyboard.mjs out/video.mp4 artifacts/storyboard.png 0.5 4
//
// Requires ffmpeg on PATH (or FFMPEG env var). Cells are 480px wide, 4 columns by
// default; blank cells appear if the video is shorter than the grid.
import {existsSync} from "node:fs";
import {spawnSync} from "node:child_process";

const [video, outFile = "storyboard.png", interval = "0.5", cols = "4"] =
  process.argv.slice(2);
const ffmpeg =
  process.env.FFMPEG ||
  (() => {
    const r = spawnSync("which", ["ffmpeg"], {encoding: "utf8"});
    return r.status === 0 ? r.stdout.trim() : null;
  })();

if (!ffmpeg || !existsSync(video)) {
  console.error("storyboard.mjs needs ffmpeg and an existing video file.");
  process.exit(2);
}

// Read duration from `ffmpeg -i` stderr to size the grid sensibly.
const probe = spawnSync(ffmpeg, ["-i", video], {encoding: "utf8"}).stderr || "";
const durMatch = probe.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
const durS = durMatch
  ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
  : null;
const intervalS = Number.isFinite(Number(interval)) ? Number(interval) : 0.5;
const samples = durS ? Math.max(1, Math.ceil(durS / intervalS)) : 16;
const nCols = Math.max(1, Math.min(8, Number(cols) || 4));
const nRows = Math.ceil(samples / nCols);

const vf =
  `fps=1/${intervalS},scale=480:-2:flags=lanczos,` +
  `tile=${nCols}x${nRows}:padding=10:margin=8:color=black`;
const r = spawnSync(
  ffmpeg,
  ["-v", "error", "-y", "-i", video, "-vf", vf, "-frames:v", "1", outFile],
  {encoding: "utf8"},
);
if (r.status !== 0) {
  console.error("storyboard failed:", r.stderr || "unknown error");
  process.exit(1);
}
console.log(`storyboard → ${outFile}  (${samples} samples @ 1/${intervalS}s, ${nCols}×${nRows} grid)`);
