# Motion Patterns — Component Library

Working, copy-paste components. Read the principles in `SKILL.md` and the craft rules
in `design-rules.md` first; this file is the "how", those are the "why".

**Verification status.** Every component below is byte-identical to code that was
compiled and rendered in the conformance project v2 (`remotion@4.0.522`, Chromium
headless-shell 149): sections are tagged `[render-verified]`. Anything tagged
`[derived]` is illustrative math or guidance built from the same primitives — it
must pass your own visual check before you ship it. Re-verify after upgrading
Remotion majors. The conformance project's color checks caught one real bug while
this file was being written (content painted under a positioned Ken Burns layer) —
the pattern and the §16 stacking rule encode that lesson.

## 0. Foundations

`assets/theme.ts` (copy into every project as `src/theme.ts`) holds all colors, type
families, easing curves, spring presets and time constants. `fr(fps, seconds)` is the
only sanctioned way to turn seconds into frames.

```ts
import {theme, fr} from "./theme";

const frame = fr(30, 1.5); // 45 — a scene boundary, named, not guessed
```

Deterministic helpers for anything "random" (grain jitter, glitch slices, shatter
positions):

```tsx
// util.ts — extracted verbatim from the render-verified conformance project v5.
// Deterministic helpers — NO Math.random/Date/toLocaleString anywhere in rendering.
// (toLocaleString output can vary with the Chromium locale/ICU build; grouping here is
// manual so frames are byte-identical across machines.)

// FNV-1a string hash → [0,1). Use for stable per-index phases, jitter, etc.
export const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

// mulberry32 — deterministic PRNG for anything that needs "random" numbers.
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Thousands grouping without locale APIs.
export const group = (n: number): string =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
```

## 1. Entrance — Reveal [render-verified]

```tsx
// Reveal.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Entrance that moves 3 properties together (opacity + rise + scale) off one spring.
// Callers compute `delayInFrames` from fps via the fr() helper — never guess by eye:
//   const delayInFrames = fr(fps, 0.35);
export const Reveal: React.FC<{
  delayInFrames?: number;
  config?: {damping: number; stiffness: number; mass: number};
  risePx?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({delayInFrames = 0, config, risePx = 40, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({
    frame: Math.max(0, frame - delayInFrames),
    fps,
    config: config ?? theme.spring.smooth,
  });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [risePx, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
```

Stagger siblings by passing `delayInFrames: fr(fps, startS) + i * fr(fps, gapS)` —
never a bare frame guess:

```tsx
{items.map((item, i) => (
  <Reveal key={i} delayInFrames={fr(fps, 0.4) + i * fr(fps, 0.12)}>
    {item}
  </Reveal>
))}
```

## 2. Word-by-word reveal [render-verified]

```tsx
// WordReveal.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Word-by-word reveal. Gap is "em" ON PURPOSE here: the flex container carries the
// caller's fontSize (via style), so em resolves against the right size. Do NOT use em
// gaps on a container whose font-size is the default 16px while its children are big.
export const WordReveal: React.FC<{
  text: string;
  delayInFrames?: number;
  perS?: number; // seconds between words — converted from fps internally
  heroWord?: string; // optional single word in brand color + glow
  style?: React.CSSProperties;
}> = ({text, delayInFrames = 0, perS = 0.1, heroWord, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const per = Math.max(1, Math.round(fps * perS));
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0.22em",
        ...style,
      }}
    >
      {text.split(" ").map((word, i) => {
        const p = spring({
          frame: Math.max(0, frame - delayInFrames - i * per),
          fps,
          config: theme.spring.snappy,
        });
        const isHero = heroWord !== undefined && word === heroWord;
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px)`,
              color: isHero ? theme.colors.brand : undefined,
              textShadow: isHero ? `0 0 42px ${theme.colors.glow}` : undefined,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
```

## 3. Icons — no emoji [render-verified]

Emoji render as full-color platform glyphs that ignore your palette and cannot be
tinted; draw glyphs instead. This set is stroke-based and inherits `currentColor`:

```tsx
// Icon.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";

// Vector icon set — replaces emoji, which ignore your palette and fight the theme.
// All glyphs are stroke-based geometric shapes on a 24×24 grid, colored via
// currentColor, so they pick up whatever color the caller sets — deterministic,
// crisp, brand-true. Extend the map with your own paths; keep geometry simple.

type IconName = "phone" | "server" | "globe" | "zap" | "play" | "check" | "arrowRight";

const GLYPHS: Record<IconName, React.ReactNode> = {
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <line x1="10.6" y1="17.8" x2="13.4" y2="17.8" />
    </>
  ),
  server: (
    <>
      <rect x="3.5" y="3" width="17" height="7.5" rx="1.8" />
      <rect x="3.5" y="13.5" width="17" height="7.5" rx="1.8" />
      <circle cx="7.4" cy="6.75" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="7.4" cy="17.25" r="1.15" fill="currentColor" stroke="none" />
      <line x1="11" y1="6.75" x2="17.5" y2="6.75" />
      <line x1="11" y1="17.25" x2="17.5" y2="17.25" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <ellipse cx="12" cy="12" rx="3.7" ry="8.6" />
      <line x1="3.4" y1="12" x2="20.6" y2="12" />
    </>
  ),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  play: <polygon points="7.5 4.5 20 12 7.5 19.5 7.5 4.5" />,
  check: <polyline points="4.5 12.6 9.6 17.7 19.5 6.8" />,
  arrowRight: (
    <>
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <polyline points="13.5 5.5 20.5 12 13.5 18.5" />
    </>
  ),
};

export const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string; // default: currentColor
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({name, size = 28, color, strokeWidth = 2, style}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color ?? "currentColor"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={style}
  >
    {GLYPHS[name]}
  </svg>
);
```

## 4. Background mesh [render-verified]

```tsx
// BgMesh.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Drifting gradient-mesh background. Sizes and drift derive from the composition
// dimensions and wall-clock seconds (frame/fps), so the same code scales from a
// 1080×1920 reel to a 1920×1080 landscape without edits. Motion is a slow sin/cos
// drift — deterministic, and slow enough to read as texture, not movement.
export const BgMesh: React.FC<{blobs?: number; style?: React.CSSProperties}> = ({
  blobs = 2,
  style,
}) => {
  const frame = useCurrentFrame();
  const {width: w, height: h, fps} = useVideoConfig();
  const t = frame / fps; // seconds — every "magic number" below is derived
  const R = Math.max(w, h); // blob size tracks the canvas, not a fixed px guess
  const driftA = R * 0.035;
  const driftB = R * 0.03;
  return (
    <AbsoluteFill style={{background: theme.colors.bg, overflow: "hidden", ...style}}>
      <div
        style={{
          position: "absolute",
          width: R * 1.15,
          height: R * 1.15,
          borderRadius: "50%",
          top: -R * 0.5 + Math.sin(t / 8 + 1) * driftA,
          left: -R * 0.38 + Math.cos(t / 11) * driftA,
          filter: `blur(${Math.round(R * 0.05)}px)`,
          background: `radial-gradient(circle, ${theme.colors.brand}33, transparent 62%)`,
        }}
      />
      {blobs >= 2 ? (
        <div
          style={{
            position: "absolute",
            width: R * 0.95,
            height: R * 0.95,
            borderRadius: "50%",
            bottom: -R * 0.42 + Math.cos(t / 9.5) * driftB,
            right: -R * 0.3 - Math.sin(t / 13) * driftB,
            filter: `blur(${Math.round(R * 0.06)}px)`,
            background: `radial-gradient(circle, ${theme.colors.accent}22, transparent 65%)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
```

## 5. Grade, Grain, Vignette [render-verified]

```tsx
// Layers.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// ── Color grade ──────────────────────────────────────────────────────────────────
// Renders ABOVE content, below grain/vignette. Unifies mismatched assets
// (AI stills, B-roll, screenshots) into one look. Tune opacity per project:
// dark themes 0.12–0.2, light themes 0.08–0.14.
export const Grade: React.FC<{opacity?: number; style?: React.CSSProperties}> = ({
  opacity = 0.16,
  style,
}) => (
  <AbsoluteFill style={{pointerEvents: "none", ...style}}>
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.brand,
        mixBlendMode: "soft-light",
        opacity,
      }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.10), transparent 28%, transparent 74%, rgba(0,0,0,0.22))",
      }}
    />
  </AbsoluteFill>
);

// ── Grain ────────────────────────────────────────────────────────────────────────
// Procedural (SVG turbulence data-URI — no asset file). Frame stepping is an integer
// multiple of the tile size derived from the canvas, so flicker is deterministic.
// Blend: "overlay" for dark themes, "multiply" for light themes (or pass through).
const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export const Grain: React.FC<{
  opacity?: number;
  blend?: "overlay" | "multiply";
  tile?: number; // tile size in px
  style?: React.CSSProperties;
}> = ({opacity = 0.055, blend = "overlay", tile, style}) => {
  const frame = useCurrentFrame();
  const {width: w, height: h} = useVideoConfig();
  const T = tile ?? Math.max(140, Math.round(Math.min(w, h) / 6));
  const step = Math.max(1, Math.round(T / 24));
  const x = ((frame * 7 * step) % T) + Math.round((w % T) / 2);
  const y = ((frame * 13 * step) % T) + Math.round((h % T) / 2);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: NOISE_URI,
        backgroundSize: `${T}px`,
        backgroundPosition: `${x}px ${y}px`,
        opacity,
        mixBlendMode: blend,
        ...style,
      }}
    />
  );
};

// ── Vignette ─────────────────────────────────────────────────────────────────────
// Topmost layer. Soft falloff only — never a hard ring.
export const Vignette: React.FC<{strength?: number; style?: React.CSSProperties}> = ({
  strength = 0.22,
  style,
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,${strength}) 100%)`,
      ...style,
    }}
  />
);
```

## 6. Ken Burns for stills [render-verified]

```tsx
// KenBurns.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {Img, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Ken Burns for every still image — eased (theme.ease.inOut), clamped, and
// edge-safe by construction: the base scale already includes the pan travel,
// so panning can never reveal the image edges.
//
// scale goes s0 → zoomTo, where s0 = 1 + 2·pan% + 0.02. That +0.02 headroom is what
// keeps edges off-screen at every intermediate frame (proof sketch: pan grows at
// most as fast as scale, and the margin available at scale s is (s−1)/2).
export const KenBurns: React.FC<{
  src: string; // staticFile("art.svg") path or URL
  zoomTo?: number; // end scale, default 1.12 (must be >= s0)
  pan?: "left" | "right" | "none"; // horizontal drift, default "right"
  panPct?: number; // pan travel as % of the smaller canvas side, default 2
  durationInFrames?: number; // default: full composition
  borderRadius?: number;
  style?: React.CSSProperties;
}> = ({src, zoomTo = 1.12, pan = "right", panPct = 2, durationInFrames, borderRadius = 0, style}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames: compDur} = useVideoConfig();
  const dur = durationInFrames ?? compDur;
  const f = Math.min(frame, dur);
  const minDim = Math.min(width, height);
  const s0 = 1 + (2 * panPct) / 100 + 0.02; // edge-safe start scale
  const s1 = Math.max(zoomTo, s0);
  const scale = interpolate(f, [0, dur], [s0, s1], {
    easing: theme.ease.inOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dir = pan === "left" ? -1 : pan === "right" ? 1 : 0;
  const travel = (minDim * panPct) / 100;
  const panX = interpolate(f, [0, dur], [0, travel * dir], {
    easing: theme.ease.inOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius,
        overflow: borderRadius ? "hidden" : undefined,
        ...style,
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${panX}px)`,
        }}
      />
    </div>
  );
};

// Usage: zoom direction should alternate between consecutive shots
// (right → left → right…) so the edit feels continuous.
export const zoomDirForShot = (shotIndex: number): "left" | "right" =>
  shotIndex % 2 === 0 ? "right" : "left";
```

**Stacking warning:** KenBurns mounts its own `position: absolute` wrapper. Any
content you place over it in the same flex parent must itself be positioned
(`position: absolute; inset: 0; zIndex: 1`) or it will paint UNDER the image — this
actually happened in the conformance project and was only caught by the brand-color
machine check (see §16 and design-rules §6).

**Scene-length zoom:** when the still lives inside a scene shorter than the
composition, pass `durationInFrames` = the scene's duration so the zoom spans the
shot, not the whole video (default is the full composition — a classic slow-zoom
surprise).

## 7. Counter [render-verified]

```tsx
// Counter.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Animated counter. Duration is in SECONDS (converted via fps), easing is explicit
// and clamped, digits use tabular-nums so layout never jitters, thousands grouping
// is manual (deterministic across locales/Chromium builds).
export const Counter: React.FC<{
  to: number;
  durationS?: number;
  delayInFrames?: number;
  digits?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({to, durationS = 1.1, delayInFrames = 0, digits = 0, prefix = "", suffix = "", style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = delayInFrames;
  const end = start + Math.max(1, Math.round(fps * durationS));
  const progress = interpolate(frame, [start, end], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const raw = to * progress;
  const fixed = digits > 0 ? raw.toFixed(digits) : String(Math.round(raw));
  const text = digits > 0 ? fixed : fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (
    <span
      style={{
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: "'tnum'",
        ...style,
      }}
    >
      {prefix}
      {text}
      {suffix}
    </span>
  );
};
```

## 8. Spark / logo mark [render-verified]

```tsx
// Spark.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Staggered "spark" mark: 12 rays fan in around a spring-loaded, counter-rotating
// hub. All quantities derive from fps/size; deterministic (no randomness).
export const Spark: React.FC<{
  size?: number;
  delayInFrames?: number;
  rays?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({size = 220, delayInFrames = 0, rays = 12, color, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = Math.max(0, frame - delayInFrames);
  const hub = spring({frame: f, fps, config: theme.spring.bouncy});
  const rot = spring({frame: f, fps, config: theme.spring.smooth});
  const c = color ?? theme.colors.brand;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        transform: `scale(${hub}) rotate(${interpolate(rot, [0, 1], [-120, 0])}deg)`,
        filter: `drop-shadow(0 0 ${Math.round(size * 0.22)}px ${theme.colors.glow})`,
        ...style,
      }}
    >
      {Array.from({length: rays}).map((_, i) => {
        const p = spring({
          frame: f - i * (30 / fps) * 1.2,
          fps,
          config: theme.spring.snappy,
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: size * 0.085,
              height: size * 0.46 * p,
              background: c,
              borderRadius: size,
              transformOrigin: "50% 0%",
              transform: `translateX(-50%) rotate(${(360 / rays) * i}deg) translateY(${size * 0.07}px)`,
            }}
          />
        );
      })}
    </div>
  );
};
```

## 9. Scene exit — faster than entrances [render-verified]

```tsx
// SceneExit.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Scene exit wrapper — exits are SHORTER than entrances (theme.time.exitS vs
// entranceS) and use the accelerating `in` curve. Apply to a whole scene via the
// scene's durationInFrames prop, or to individual elements via their own range.
export const SceneExit: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({durationInFrames: dur, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const exitF = Math.max(1, Math.round(fps * theme.time.exitS));
  const start = Math.max(0, dur - exitF);
  const y = interpolate(frame, [start, dur - 1], [0, -42], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const o = interpolate(frame, [start, dur - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        opacity: o,
        transform: `translateY(${y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
```

## 10. Idle breathing — and when NOT to use it [render-verified]

```tsx
// useBreathe.ts — extracted verbatim from the render-verified conformance project v5.
import {useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";

// Idle micro-motion for elements that sit still for > ~2 s.
//
// STILLNESS DOCTRINE (read this before using): holds are a design tool — after a
// beat lands, full stillness reads as confidence; constant motion reads amateur.
// So: breathe only elements that would otherwise be static for more than ~2s, keep
// the amplitude tiny (scale ±theme.time.breatheAmp), and never apply it during a
// planned hold or to something the viewer must read while it "should" rest.
// Phase by element index so siblings don't pulse in lockstep:
//   const b = useBreathe(i * 7);
export const useBreathe = (
  phaseInFrames = 0,
  ampScale = theme.time.breatheAmp,
  ampY = 2.5,
) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame + phaseInFrames) / (fps * 2.1); // ~4.2 s period — imperceptible
  const s = 1 + Math.sin(t * Math.PI * 2) * ampScale;
  const y = Math.sin(t * Math.PI * 2 + 1.3) * ampY;
  return {transform: `scale(${s}) translateY(${y}px)`};
};
```

Read the stillness doctrine in `design-rules.md` §Rhythm before sprinkling breathing:
a hold with zero motion is a feature. Breathing is for elements that outlive the
scene's motion, never for a beat you are trying to hold still.

## 11. Motion blur for fast moves [render-verified]

Two tools. For per-frame moves faster than ~30 px, a short CSS blur reads as motion
blur and is nearly free:

```tsx
const blur = interpolate(frame, [start, start + 4, start + 10], [0, 12, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
// style={{filter: `blur(${blur}px)`}} on the moving element
```

For true trails use `<Trail>` from `@remotion/motion-blur` — **all four props are
required**, and `lagInFrames` is in FRAMES (0.4 = four tenths of a frame =
invisible):

```tsx
import {Trail} from "@remotion/motion-blur";

<Trail layers={4} lagInFrames={1} trailOpacity={0.45}>
  <MovingThing />
</Trail>
```

Trail re-renders its children once per layer at lagged frames — expensive on big
canvases. Mount it only for the motion window and unmount once the move settles.

**Review lesson (round 3):** the conformance `Beat` scene originally wrapped its
entrance in `<Trail>` — but the entrance included a counting counter, and trailing
re-rendered the digits at lagged frames, smearing the numbers into an unreadable
ghost. Trail is for **rigid, whole-element moves** (a card, a logo, a photo). Never
wrap type, counters, captions or anything that re-renders per frame; there the cheap
and correct "motion blur" is a short CSS blur on the moving container, or nothing —
slow moves (Ken Burns) need neither.

## 12. Transitions — library [render-verified]

```tsx
// Probe.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {AbsoluteFill} from "remotion";
import {TransitionSeries, springTiming} from "@remotion/transitions";
import {slide} from "@remotion/transitions/slide";

// Diagnostic composition: measures TransitionSeries duration math empirically.
// Scene A is pure red (30 frames), scene B pure blue (30 frames), joined by
// slide({direction: "from-right"}) + springTiming({durationInFrames: 12}).
// The rendered output is scanned frame-by-frame: the last non-black frame tells us
// the true total length, which confirms the total = Σscenes − Σtransitions formula.
export const ProbeA: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: "#E23A2E"}} />
);
export const ProbeB: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: "#2E5BE2"}} />
);

export const Probe: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={30}>
      <ProbeA />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition
      presentation={slide({direction: "from-right"})}
      timing={springTiming({durationInFrames: 12})}
    />
    <TransitionSeries.Sequence durationInFrames={30}>
      <ProbeB />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
```

Measured against `remotion@4.0.522` with scenes of 30 + 30 frames and a 12-frame
transition: the composition's true length is **30 + 30 − 12 = 48 frames** — each
transition consumes `durationInFrames` from the naive sum, and the outgoing scene
keeps rendering during the overlap. Set your `durationInFrames` on the Composition
with that formula, and verify the cut points with stills. Prefer `springTiming`
(tuned, clampable) over `linearTiming` (keep linear for dissolves where constant
speed is the point).

Hand-rolled transitions [derived — verify at your cut frames before shipping]:

```tsx
// Whip-pan: slide + blur out, then slide + blur in (8–14 frames total).
// Uses theme.ease.in for the exit half and theme.ease.out for the entry half.
const out = interpolate(frame, [dur - 8, dur - 1], [0, -1300], {
  easing: theme.ease.in,
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const outBlur = interpolate(frame, [dur - 8, dur - 1], [0, 10], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
// Render outgoing scene with transform: translateX(out) and filter: blur(outBlur),
// then start the next scene with a mirrored translateX(1300→0) + blur(10→0) entry.
```

## 13. Sound design [render-verified]

Sound as data: one events array next to the TIMING table; a Bed component with
frame-exact ducking. This file also documents levels and the deterministic kit.

```tsx
// SoundDesign.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {Audio, Sequence, staticFile, useVideoConfig} from "remotion";

// ── Sound design as data ──────────────────────────────────────────────────────────
// One event array per composition, declared next to the TIMING table so the audio
// map reads like a score. Rules (design-rules §5):
//   • sounds LEAD their visual by ~3 frames — early reads synced, late reads broken;
//   • whoosh/riser into a HIT, bass ON the beat/cut, pop for UI, shimmer for reveals,
//     impact for payoffs; alternate tick/tick2 while counting (machine-gun guard);
//   • bed (music/pad) at ~0.2–0.5, SFX 0.3–0.55, VO 0.8–1.0 with bed ducked.
export type SfxEvent = {
  at: number; // frame of the visual this sound belongs to
  file: string; // path relative to public/ — e.g. "sfx/whoosh.wav"
  volume?: number; // 0–1 linear gain (default 0.5)
  leadS?: number; // seconds before `at` the sound starts (default 0.1)
  durF?: number; // mounted duration in frames (default 20)
};

export const SoundDesign: React.FC<{events: SfxEvent[]}> = ({events}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {events.map((e, i) => {
        const leadF = Math.max(0, Math.round(fps * (e.leadS ?? 0.1)));
        return (
          <Sequence
            key={`${e.file}-${e.at}-${i}`}
            from={Math.max(0, e.at - leadF)}
            durationInFrames={e.durF ?? 20}
          >
            <Audio src={staticFile(e.file)} volume={e.volume ?? 0.5} />
          </Sequence>
        );
      })}
    </>
  );
};

// ── Bed (music/pad) with ducking ─────────────────────────────────────────────────
// Duck the bed under VO or busy SFX windows. Each duck is a trapezoid: ramp down
// over the first 15% of the window, hold at toVolume, ramp back over the last 15%.
// Multiple windows compose by taking the deepest active duck at each frame.
// Deterministic, frame-exact, no audio API needed.
export type DuckWindow = {from: number; to: number; toVolume: number};

export const Bed: React.FC<{
  src: string; // e.g. "sfx/track.wav"
  volume?: number; // normal level (default 0.4)
  ducks?: DuckWindow[];
}> = ({src, volume = 0.4, ducks = []}) => (
  <Audio
    src={staticFile(src)}
    volume={(frame: number) => {
      let v = volume;
      for (const d of ducks) {
        if (frame < d.from || frame > d.to) continue;
        const span = Math.max(1, d.to - d.from);
        const u = (frame - d.from) / span;
        const shape =
          u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1;
        v = Math.min(v, volume + (d.toVolume - volume) * shape);
      }
      return v;
    }}
  />
);
```

Beat grid: `framesPerBeat = fps * 60 / bpm` — place cuts and hits on multiples of it.
SFX lead their visual by ~3 frames (`leadS: 0.1`) — early reads synced, late reads
broken. **Sparse by design (round-4 calibration):** one sound at a time, silence
between events, ≤2 overlapping at any moment; a counting counter gets milestone
ticks (alternating tick/tick2), not a steady stream; a scene entrance gets one hit
on the cut, not a pile-up. Bed ~0.3–0.45, SFX 0.4–0.7, duck the bed under busy
windows (Bed `ducks` array — deepest active duck wins). Measured conformance v4
master with this mix: mean −25.6 dB, max −7.3 dB, SFX audible 3–5 dB above the
ducked bed by construction.

**Dual-mix deliverable.** Let the user choose what they hear: register the same
component twice with a `music` boolean prop (one renders `<Bed/>`, the other does
not — the conformance project ships `ConfPromo` full and `ConfPromoClean`
SFX-only), render both masters, verify both, and let the user pick — or ask
up-front and render only the chosen variant. Measured v5: full mean −25.6 dB /
max −7.3 dB; clean mean −26.3 dB / max −7.3 dB. Use clean for VO-led or
corporate pieces where a beat would fight the words.

Synthesize everything with:

```bash
node scripts/synth-sfx.mjs public/sfx 16    # whoosh, riser, pop, tick, tick2, bass,
                                            # impact, shimmer, pad16.wav — all seeded
node scripts/synth-music.mjs public/sfx/track.wav 120 8 45 20260908
#              out file ↑                        ↑bpm ↑sec ↑root(A2=45) ↑seed
```

`synth-music.mjs` writes a structured bed (Am→F→C→G bars, bass, kick, offbeat hats,
intro-to-full dynamics) whose beat grid your cuts can lock to — placeholder quality,
swap for real music when the user has it. Both scripts are seeded: same arguments ⇒
byte-identical files.

## 14. Word-synced captions over footage [render-verified]

Full page-rendering component, plus a demo composition rendered with a synthetic
transcript (no audio needed to test it). Real usage: feed Whisper /
`@remotion/install-whisper-cpp` output — `{text, startMs, endMs}` per word — as the
`words` prop. This comp is verified in the conformance project (both pages show
text, the active token flips to brand color at the right frame).

```tsx
// Captions.tsx — extracted verbatim from the render-verified conformance project v5.
import React, {useMemo} from "react";
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {createTikTokStyleCaptions, type Caption, type TikTokPage} from "@remotion/captions";
import {theme} from "../theme";

// ── Word-synced captions ──────────────────────────────────────────────────────────
// Input: Caption[] — {text, startMs, endMs} — from a transcriber (Whisper,
// @remotion/install-whisper-cpp, or your own arrays). createTikTokStyleCaptions
// groups tokens into pages of ~2–4 words; render one <Sequence> per page and
// highlight the token the playhead is inside.
// Standard transcript input: @remotion/captions Caption objects (Whisper and
// @remotion/install-whisper-cpp produce these directly — text/startMs/endMs plus
// timestampMs and confidence, which the types require).

const msToFrame = (ms: number, fps: number) => Math.round((ms / 1000) * fps);
const curMs = (frame: number, fps: number) => (frame / fps) * 1000;

export const CaptionPages: React.FC<{
  captions: Caption[];
  style?: React.CSSProperties;
}> = ({captions, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // Pages depend only on the transcript — memoize so they are not recomputed
  // every frame (review round 3; type-correctness fixed in round 4 — Caption
  // requires timestampMs/confidence).
  const {pages} = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: 400, // group words ~≤0.4 s apart
      }),
    [captions],
  );
  const activeMs = curMs(frame, fps);
  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", ...style}}>
      {pages.map((page: TikTokPage) => (
        <Sequence
          key={page.startMs}
          from={msToFrame(page.startMs, fps)}
          durationInFrames={msToFrame(page.durationMs, fps)}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0.18em",
              padding: "0 6%",
            }}
          >
            {page.tokens.map((tok) => {
              const isActive = activeMs >= tok.fromMs && activeMs < tok.toMs;
              return (
                <span
                  key={`${tok.fromMs}`}
                  style={{
                    fontFamily: theme.fonts.display,
                    fontWeight: 700,
                    fontSize: 64,
                    lineHeight: 1.2,
                    color: isActive ? theme.colors.brand : theme.colors.text,
                    transform: isActive ? "translateY(-4px)" : undefined,
                  }}
                >
                  {tok.text}
                </span>
              );
            })}
          </div>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Synthetic demo transcript — Whisper output carries the same shape, including
// timestampMs (millisecond offset into the media) and confidence (0–1).
export const DEMO_CAPTIONS: Caption[] = [
  {text: "Look", startMs: 400, endMs: 760, timestampMs: 400, confidence: 0.99},
  {text: "at", startMs: 760, endMs: 1020, timestampMs: 760, confidence: 0.99},
  {text: "this.", startMs: 1020, endMs: 1500, timestampMs: 1020, confidence: 0.99},
  {text: "Words", startMs: 2600, endMs: 3100, timestampMs: 2600, confidence: 0.99},
  {text: "move", startMs: 3100, endMs: 3520, timestampMs: 3100, confidence: 0.99},
  {text: "in", startMs: 3520, endMs: 3750, timestampMs: 3520, confidence: 0.99},
  {text: "sync.", startMs: 3750, endMs: 4200, timestampMs: 3750, confidence: 0.99},
];

export const CaptionsDemo: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, ${theme.colors.surface}, ${theme.colors.bg})`,
    }}
  >
    <CaptionPages captions={DEMO_CAPTIONS} />
  </AbsoluteFill>
);
```

## 15. Underline/pill highlight for a hero word [render-verified]

Scale in AFTER the word lands (~5–8 frames later). The highlight owns the scene's
brand/glow budget — keep the rest of the line neutral (see the conformance CTA
scene: accent ring + accent check icon, brand ONLY on the highlight).

```tsx
// WordHighlight.tsx — extracted verbatim from the render-verified conformance project v5.
import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {theme} from "../theme";

// Animated underline/pill that scales in under a word AFTER it has landed
// (delay the highlight by ~5–8 frames past the word's entrance). The highlight is
// the scene's brand/glow element — keep everything else on that line neutral.
export const WordHighlight: React.FC<{
  delayInFrames?: number;
  color?: string;
  thicknessPx?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({delayInFrames = 0, color, thicknessPx = 10, style, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({
    frame: Math.max(0, frame - delayInFrames),
    fps,
    config: theme.spring.snappy,
  });
  return (
    <span style={{position: "relative", display: "inline-block", ...style}}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "2%",
          right: "2%",
          bottom: -thicknessPx * 0.45,
          height: thicknessPx,
          borderRadius: 999,
          background: color ?? theme.colors.brand,
          transform: `scaleX(${interpolate(p, [0, 1], [0, 1], {
            easing: theme.ease.out,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
          transformOrigin: "left center",
          opacity: p,
          boxShadow: `0 0 26px ${theme.colors.glow}`,
        }}
      />
    </span>
  );
};
```

## 16. Layout & stacking guardrails [derived — check via stills]

- Critical content inside the middle band: for 9:16 keep text between 12% and 88% of
  height (platform UI overlaps top/bottom); for 16:9 keep 8% margins.
- Hero type caps at 1080-wide canvases: 80–140 px (display face, −0.03em, 1.05 line
  height). Scale with canvas width; at 1920 multiply by ~1.7.
- Pixel gaps (`gap: 42`) between independent big-type blocks; `em` gaps only where
  the flex container itself carries the font-size (see WordReveal).
- Never rely on default system fonts for heroes — load via `@remotion/google-fonts`
  or self-hosted `@font-face` (offline path in design-rules.md §2).
- Tabular numerals (`fontVariantNumeric`) for anything that changes value (Counter).
- **Painting order:** positioned elements paint over static siblings. Full-bleed
  media (`absolute`) will cover static text — content over media must be positioned
  too. Symptom: stills pass "not blank / not flat" while the hero is invisible.
  That is exactly what the `--colors` brand check is for; calibrate its thresholds
  from observed absent/present counts, never from thin air.
- After render, still-check: nothing touching frame edges, no overflow, no element
  visible before its entrance (missing clamp) — the universal trap.

## 17. Media handling & delivery presets

- Every still image: Ken Burns (§6), alternate pan direction between consecutive
  shots. Footage: `<OffthreadVideo>` (never `<Video>` — it blocks on the main
  thread).
- Get clip duration/fps with ffprobe before sizing the composition to it.
- Per-asset color correction: `filter: "saturate(1.1) contrast(1.05)"` only on the
  asset that sticks out — the Grade layer unifies the rest.
- Poster: `npx remotion still src/index.ts <CompId> artifacts/poster.png --frame <F>`.
- Fast GIF preview: add `--codec gif --every-nth-frame 2`. Draft loop: run
  `npx remotion studio` and let the user scrub before the final render.
- Storyboard: `node scripts/storyboard.mjs artifacts/video.mp4 artifacts/storyboard.png 0.5 4` —
  a contact sheet a reviewer can approve in seconds.

## Appendix — pattern → conformance source map

Every `[render-verified]` block above is extracted verbatim from the conformance
project v5 that rendered `conf.mp4` (5 s, 1080×1920@30, full mix), `conf-clean.mp4`
(same visuals, SFX-only mix) and `captions.mp4` (synthetic transcript) — machine
checks incl. brand-color presence PASS for both masters. If you edit a pattern,
re-run that project before shipping the edit.
