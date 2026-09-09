#!/usr/bin/env node
// scaffold.mjs — one-command start of a skill-conformant Remotion project.
//
// Usage:
//   node scripts/scaffold.mjs <projectDir> [durationSeconds=5] [fps=30] [width=1080] [height=1920]
//   node scripts/scaffold.mjs my-video 6 30 1080 1920
//
// What you get: package.json pinned to the tested Remotion version, src/index.ts +
// src/Root.tsx with a TIMING-table skeleton, the theme template, and the skill
// scripts (synth-sfx, synth-music, verify-render, storyboard). Then:
//   cd my-video && npm install
//   npm run audio      # SFX kit + music bed
//   npx remotion studio src/index.ts   # draft in the browser
//   npm run render && npm run verify
// The authoritative how-to is SKILL.md — this is only the fast path.
import {cpSync, mkdirSync, writeFileSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const [dir = "remotion-video", secs = "5", fpsArg = "30", wArg = "1080", hArg = "1920"] =
  process.argv.slice(2);
const durationS = Math.max(1, Number(secs) || 5);
const fps = Math.max(1, Number(fpsArg) || 30);
const width = Math.max(2, Math.round(Number(wArg) || 1080));
const height = Math.max(2, Math.round(Number(hArg) || 1920));
const totalFrames = Math.round(fps * durationS);
const skillRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

mkdirSync(join(dir, "src"), {recursive: true});
mkdirSync(join(dir, "public"), {recursive: true});
mkdirSync(join(dir, "scripts"), {recursive: true});
mkdirSync(join(dir, "artifacts"), {recursive: true});

// pinned, tested versions — duration flows into the verify command so a 5s or 60s
// scaffold verifies against ITS OWN spec, not a hardcoded 8 (review round 3 fix).
const durVerify = Math.round(durationS * 10) / 10;
const packageJson = {
  name: dir.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
  version: "0.1.0",
  private: true,
  scripts: {
    audio:
      "node scripts/synth-sfx.mjs public/sfx 8 && node scripts/synth-music.mjs public/sfx/track.wav 120 8 45 20260908",
    studio: "remotion studio src/index.ts",
    render: "remotion render src/index.ts Main artifacts/video.mp4 --codec h264 --crf 18",
    still: "remotion still src/index.ts Main",
    verify: `node scripts/verify-render.mjs artifacts/video.mp4 --expect-audio --duration ${durVerify} --fps ${fps}`,
    storyboard: "node scripts/storyboard.mjs artifacts/video.mp4 artifacts/storyboard.png",
  },
  dependencies: {
    "@remotion/captions": "4.0.522",
    "@remotion/cli": "4.0.522",
    "@remotion/google-fonts": "4.0.522",
    "@remotion/motion-blur": "4.0.522",
    "@remotion/transitions": "4.0.522",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    remotion: "4.0.522",
  },
};

const loadFontsTs = `// Fonts are loaded at app entry so the first render is NOT a system-fallback
// hero (the classic "looks default" trap). Weights + latin subset only: loading
// every weight/subset costs 100+ network requests.
import {loadFont as loadDisplay} from "@remotion/google-fonts/SpaceGrotesk";
import {loadFont as loadBody} from "@remotion/google-fonts/Inter";

export const loadFonts = (): void => {
  loadDisplay("normal", {weights: ["500", "700"], subsets: ["latin"]});
  loadBody("normal", {weights: ["400", "500"], subsets: ["latin"]});
};
`;

const rootTsx = `import React from "react";
import {AbsoluteFill, Audio, Composition, Sequence, staticFile} from "remotion";
import {theme} from "./theme";
import {fr} from "./theme";
import {loadFonts} from "./load-fonts";

loadFonts();

const FPS = ${fps};

// TIMING table — seconds only. Frames derive from fps (P6: no orphan numbers).
const SCENES = {
  intro: {start: 0, durS: ${Math.max(1, durationS * 0.5).toFixed(2)}},
};
const TOTAL_F = Math.round(FPS * ${durationS});

const SceneA: React.FC = () => (
  <AbsoluteFill style={{justifyContent: "center", alignItems: "center"}}>
    <div
      style={{
        fontFamily: theme.fonts.display,
        fontWeight: 700,
        fontSize: ${Math.round(width * 0.1)},
        color: theme.colors.text,
      }}
    >
      Your title here
    </div>
  </AbsoluteFill>
);

export const Main: React.FC = () => {
  const introF = fr(FPS, SCENES.intro.durS);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={introF}>
        <SceneA />
      </Sequence>
      {/* every scaffolded project ships with sound: pad bed (npm run audio made it).
          See motion-patterns.md §13 to swap in the music bed + SFX score. */}
      <Audio src={staticFile("sfx/pad8.wav")} volume={0.25} />
      {/* finish layers: grade / grain / vignette — see motion-patterns.md §5 */}
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    durationInFrames={TOTAL_F}
    fps={FPS}
    width={${width}}
    height={${height}}
  />
);
`;

const indexTs = `import {registerRoot} from "remotion";
import {Root} from "./Root";

registerRoot(Root);
`;

writeFileSync(join(dir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");
writeFileSync(join(dir, "src", "Root.tsx"), rootTsx);
writeFileSync(join(dir, "src", "load-fonts.ts"), loadFontsTs);
writeFileSync(join(dir, "src", "index.ts"), indexTs);
cpSync(join(skillRoot, "assets", "theme.ts"), join(dir, "src", "theme.ts"));
for (const s of ["synth-sfx.mjs", "synth-music.mjs", "verify-render.mjs", "storyboard.mjs"]) {
  cpSync(join(skillRoot, "scripts", s), join(dir, "scripts", s));
}

console.log(`scaffolded ${dir} (${width}×${height} @ ${fps}fps, ${durationS}s = ${totalFrames} frames)
next:
  cd ${dir}
  npm install
  npm run audio
  npx remotion studio src/index.ts     # draft fast, scrub scenes
  npm run render && npm run verify`);
