// theme.ts — the single source of truth for the BRANDED FRAME of a Remotion project.
//
// Rule of thumb: anything that encodes a design decision about color, type, easing or
// timing belongs in this file or in a *named, colocated palette* next to the component
// that owns it (e.g. a diegetic code-editor UI, a pixel-art sprite sheet). What is
// forbidden is stray literals scattered through scenes: every color/easing/spring must
// be reachable from a named export. If you need to deviate, add a named export and
// comment why — never inline silently.
//
// Font loading (do once at app entry, see references/design-rules.md §2 Typography):
//   import {loadFont} from "@remotion/google-fonts/SpaceGrotesk";
//   loadFont("normal", {weights: ["500", "700"]});
// The default families below all exist on @remotion/google-fonts. For fully offline or
// pixel-identical builds, self-host the woff2 files in public/fonts and declare them
// with @font-face + staticFile() instead of loading from the network.
import {Easing} from "remotion";

export const theme = {
  colors: {
    bg: "#0A0A0F", // page background
    surface: "#131320", // cards, chips, panels
    border: "rgba(255,255,255,0.10)",
    text: "#F4F4F5", // primary text — aim >= 4.5:1 against bg
    textMuted: "#A1A1AA", // secondary text — aim >= 4.5:1 against bg
    brand: "#7C3AED", // THE hero color — at most one hero element per frame
    accent: "#22D3EE", // data/diagram accents — not for text
    glow: "rgba(124,58,237,0.35)",
  },
  fonts: {
    display: "Space Grotesk", // weights 500/700 — hero type only
    body: "Inter", // weights 400/500 — labels, paragraphs
    mono: "JetBrains Mono", // weights 500/700 — numbers, URLs, code
  },
  ease: {
    // Every easing below is a named decision. There is deliberately no `linear` here:
    // linear motion is legal ONLY as an explicit, commented choice at the call site
    // (constant-speed pans, film-style dissolves). Never an unexamined default.
    out: Easing.bezier(0.16, 1, 0.3, 1), // entrances — fast start, long settle
    inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera moves, Ken Burns, slides
    in: Easing.bezier(0.7, 0, 0.84, 0), // exits only — slow start, fast leave
  },
  spring: {
    snappy: {damping: 14, stiffness: 160, mass: 0.6}, // words, chips, micro-UI
    smooth: {damping: 20, stiffness: 90, mass: 1}, // big elements, cards
    bouncy: {damping: 11, stiffness: 170, mass: 0.7}, // playful accents, logo marks
  },
  time: {
    // Seconds, never bare frames: convert at the call site with Math.round(fps * s).
    entranceS: 0.55, // entrance travel duration
    exitS: 0.28, // exits are shorter than entrances
    staggerS: 0.13, // default gap between staggered siblings
    holdMinS: 0.5, // minimum planned stillness after a beat lands
    breatheAmp: 0.012, // idle micro-motion amplitude, scale units
  },
} as const;

// Frames for `seconds` at the composition's fps — the ONLY sanctioned way to turn
// wall-clock time into frames. Never hand-count frames.
export const fr = (fps: number, seconds: number): number =>
  Math.max(0, Math.round(fps * seconds));
