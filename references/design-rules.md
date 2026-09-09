# Design Rules — the craft system

Every rule below states its **why** and its **carve-outs**. A rule without a carve-out
is dogma; dogma is what makes AI video look AI. The principles in `SKILL.md` are the
contract; this file is the detail. When you deliberately break a rule, write the
reason in a comment at the call site and say so in the delivery note — that is how a
"violation" becomes an "intentional choice".

---

## 1. Color

**System.** One base + one brand (hero) color + one accent + neutrals, at ~60/30/10.
The brand color appears on **at most one hero element per frame** — it is the eye's
anchor. Two brand-colored heroes split attention; three reads as a sale banner.

**Glow budget.** Glow (box/text-shadow in brand color) on that same single hero
element only. More than one glowing element per frame = Vegas.

**Proven palettes** (adapt to the user's brand; keep the ratios, not the hexes):

| Name | Base | Surface | Brand | Accent | Text |
|---|---|---|---|---|---|
| Dark tech | `#0A0A0F` | `#131320` | `#7C3AED` | `#22D3EE` | `#F4F4F5` / `#A1A1AA` |
| Warm editorial | `#FAF7F2` | `#F1EBE1` | `#D97757` | — | ink `#1F1E1B` / `#8A8378` |
| Warm premium | `#1A120B` | `#241A10` | `#E8A33D` | `#F4E9DA` | `#FBF6EC` / `#A99E8F` |
| Clean light | `#F7F5F2` | `#FFFFFF` | one saturated accent | — | `#1A1A1A` / `#6B6B6B` |

**Contrast floor.** Body and muted text must hold ≥ 4.5:1 against the background
(WCAG AA); large display text ≥ 3:1. **Computed ratios for the shipped palettes**
(not claims — these were calculated; re-check after any palette edit, or run the
still-level color checks in §9):

| Pair | Ratio | Verdict |
|---|---|---|
| dark: text `#F4F4F5` / bg `#0A0A0F` | 17.97 | ✓ body |
| dark: textMuted `#A1A1AA` / bg | 7.71 | ✓ body |
| dark: **brand `#7C3AED` / bg** | **3.47** | ⚠ large text only (≥3). Never brand as small body text |
| dark: text / surface `#131320` | 16.73 | ✓ |
| dark: accent `#22D3EE` / bg | 10.93 | ✓ (diagrams) |
| warm: ink `#1F1E1B` / cream `#FAF7F2` | 15.60 | ✓ |
| warm: **inkDim `#8A8378` / cream** | **3.51** | ⚠ large only — use ink for small text |
| warm: **brand `#D97757` / cream** | **2.92** | ✗ even large is borderline. Use for big display accents only, or switch to `#B55333` (4.62 on cream, 4.94 on white) for anything smaller |
| warm: ink / surface `#F1EBE1` | 14.06 | ✓ |

Rule of thumb that follows from the math: **the brand color is for large type and
graphics, never for paragraphs** — in both shipped palettes it only passes the 3:1
bar at display sizes (or needs a darkened variant).


**Carve-out.** Diegetic palettes (a code editor UI, a pixel sprite sheet, a chart)
may live **next to the component that owns them as a named export** (e.g.
`const C = {...}` at the top of `CodeEditor.tsx`), because they model a foreign
system, not your brand frame. The rule that never bends: no *stray* literals
scattered through scenes, and diegetic palettes don't get glow.

**Icons.** SVG/CSS glyphs in theme colors (see motion-patterns §Icons). No emoji:
they render as platform glyphs, ignore the palette, and silently break the
one-brand-color rule.

## 2. Typography

**Stacks** — all verified loadable via `@remotion/google-fonts` (load at app entry,
weights + latin subset only; see motion-patterns §0 note):

| Role | Face (module) | Weights | Notes |
|---|---|---|---|
| Display | Space Grotesk (`/SpaceGrotesk`) | 500, 700 | default hero face |
| Display alt | Fraunces (`/Fraunces`) | 600, 700 | warm/editorial serif |
| Body | Inter (`/Inter`) | 400, 500 | labels, paragraphs |
| Mono | JetBrains Mono (`/JetBrainsMono`) | 500, 700 | numbers, URLs, code |

Swap faces in `theme.ts`; every text style then follows. Fontsource/Fontshare faces
work too but must be self-hosted (below).

**Scale** (px at 1080 canvas width; ×1.7 for 1920-wide):
hero 80–140 · sub 44–60 · body 32–44 · caption 26–34.
Hero style: weight 600–800, letterSpacing −0.03em, lineHeight 1.05, centered, one
**hero word** emphasized (brand color, or pill/underline that scales in ~5 frames
after the word lands). Muted mono kickers (uppercase, +0.3em tracking) above or
below titles read "designed", not "typed".

**Offline / deterministic fonts.** `@remotion/google-fonts` fetches from Google at
render time — fine with network, fatal without. For offline or byte-identical CI:
download the woff2 files once into `public/fonts/`, declare `@font-face` with
`staticFile()` URLs, set `theme.fonts` to those family names, and skip the loader.

**Layout.** Pixel gaps between independent big-type blocks (em gaps resolve against
the *container's* font-size — the classic 16px-trap next to 140px type). Tabular
numerals for anything numeric that animates. 9:16 safe zone: critical content inside
the middle vertical band (12%–88%), because platform UI overlaps top/bottom.

## 3. Motion language

| Intent | Tool | Curve |
|---|---|---|
| Entrances | spring or interpolate, 2–3 props together | `ease.out` family |
| Exits | faster than entrances (~0.28 s vs ~0.55 s) | `ease.in` |
| Camera, pans, slides | interpolate, clamped | `ease.inOut` |
| Constant-speed moves (Ken Burns drift, dissolves) | interpolate | linear **is legal here — comment why** |

Linear is not banned; *accidental* linear is. Everything else in the original rule
stands: an entrance that only fades, siblings that land simultaneously, exits that
linger — each is a symptom of default motion, which is the "generic AI" look.

**Stagger.** Siblings enter 3–6 frames apart (via `fr(fps, 0.1–0.2)`). Words 0.1 s;
cards 0.15 s; big blocks 0.2 s.

**Motion blur is for rigid bodies only.** Ghosting/trails on type, counters or
captions smears the glyphs/digits themselves (they re-render every frame) — a real
bug caught in review round 3, where a <Trail> around a counting counter produced
unreadable digit ghosts. If the element contains text that changes, use a short CSS
blur on the moving container or nothing at all.

**Holds are a design tool.** Fast move → complete stillness → next move. Constant
motion reads amateur; *contrast* reads expensive. Micro-motion ("breathing") is only
for elements idle > 2 s **outside** planned holds, amplitude ≤ ~1.5% scale, phase
varied per element (useBreathe). Do not breathe a headline that a hold is meant to
let the viewer read.

**Pacing.** New visual element at least every ~3 s. Scene rhythm: HIT → hold
(15–20 still frames) → build → HIT. First movement of a hook scene within the first
15 frames or the first 0.5 s.

## 4. Scene architecture

A 30 s reel skeleton (proportions, not law): HOOK 0–1.5 s (boldest claim + movement
immediately) · CONTEXT 1.5–3 s · BODY 3–22 s in 3–4 beats · PAYOFF 22–27 s (biggest
animation of the piece) · CTA 27–30 s (one calm action, glow on the CTA word).

Shorter pieces: 5 s logo sting = mark-in 0–0.8 s → wordmark 0.6–1.8 s → tagline
2–3.5 s → breathe → exit in the last 0.4 s.

**Shot list first.** Before writing components, write the scene table — content,
duration in seconds, beats, transitions — and convert with `fr(fps, s)` in one
TIMING object at the top of the composition (see conformance `Root.tsx`). A scene
that exists only in code is a scene you can't critique; the table is the critique.

## 5. Sound

Sound is ~half of perceived quality. **Silence is a decision**, not a default: ship
silent only when the user asked for it.

**The kit** (`scripts/synth-sfx.mjs`, deterministic, offline, byte-identical across
runs): whoosh (entrances/transitions) · riser (build into a HIT — start ~0.5 s
early) · bass (ON cuts/beats) · impact (layered payoff hit) · pop (UI/chips) ·
tick + tick2 (counters — **alternate them**, same pitch twice in a row
machine-guns) · shimmer (logo glints, reveals) · pad<N> (bed).

**Music bed** (`scripts/synth-music.mjs`): a deterministic generator with a real
beat grid — args `(out, bpm, seconds, rootMidi, seed)`; arranges Am→F→C→G over
bars with pad chords, 8th bass, kick and offbeat hats, intro-to-full dynamics.
Cut to it: `framesPerBeat = fps × 60 / bpm`; scene changes landing on a beat hit
feel locked (the conformance reel cuts at 1.5 s/3.5 s = beats 3/7 of the 120 BPM
bed). It is a placeholder-quality sketch — swap in real music whenever the user has
it, and say so.

**Levels & ducking.** Bed ~0.3–0.45, SFX 0.4–0.7, VO 0.8–1.0 with the bed ducked
under speech/SFX windows (Bed takes a `ducks` array — trapezoid per window, deepest
active duck wins). Two mix lessons, both measured:
1. **Masking** — a bed at 0.5 buries quiet SFX (they surface only when the drums
   drop: "effects play sometimes"). Keep SFX ≥3–5 dB above the ducked bed.
2. **Sparseness** — fewer, better-placed sounds read as more expensive. Round-4
   conformance mix: 8 events over 5 s, one sound at a time, silence between events,
   CTA has impact-on-cut + one late shimmer (not a 4-sound pile-up), a counting
   counter gets 2 milestone ticks + 1 landing pop (not 5 evenly spaced ones).
   Measured: master mean −25.6 dB / max −7.3 dB; bed 0.34 ducked to 0.14/0.16, SFX
   0.4–0.6. Raw track alone: −16.4 dB mean / −2.0 dB peak.
   (Honesty note: the round-3 numbers in earlier docs were measured on a render
   whose code no longer matched the doc — a version-skew bug, not audio science;
   numbers here are re-measured from the actual v4 render.)

**Mix modes.** Deliver what the user wants to hear, and ask before the final render:
- **Full** (default): music bed + SFX. For social/entertainment cuts; scene cuts
  land on the bed's kick (framesPerBeat grid).
- **SFX-only / clean**: no bed — the SFX score alone (plus pad if wanted). For
  VO-led or corporate/instructional pieces where a beat fights the words, or
  wherever the user prefers it.
- **Both**: one component with a `music` boolean prop and two registered
  Compositions (`defaultProps`), two renders, one verify pass each — then the user
  picks after listening. Measured conformance v5 masters: full mean −25.6 dB / max
  −7.3 dB; clean mean −26.3 dB / max −7.3 dB (same SFX peaks, no bed).

**Loudness verification.** `ffmpeg -i artifacts/video.mp4 -af volumedetect -f null -`: `max_volume`
above −1 dB means clipping risk — fix gains, don't ship hot. For platform uploads
aim integrated loudness around −14 LUFS if you have a loudness meter; volumedetect
is the cheap proxy. **Listen to the mix before delivering** — stats confirm
"present, no clip", they do not confirm "pleasant".

## 6. Media & assets

- Every still: Ken Burns, eased and edge-safe (motion-patterns §6); alternate pan
  direction between consecutive shots. Every footage clip: `<OffthreadVideo>`.
- When generating stills for a video, keep one prompt skeleton and vary only the
  subject — identical lighting/palette phrasing across the set, generated at the
  final aspect ratio:
  `[subject], cinematic product photography, dark moody studio, [brand] rim
  lighting, deep shadows, shallow depth of field, 9:16`
- Speech present → captions mandatory (accessibility + muted autoplay), positioned
  ~78% height on 9:16 (motion-patterns §14).
- **Stacking rule (learned the hard way).** Full-bleed media is positioned
  (`absolute`); a *static* sibling in the same flex parent paints **underneath** it —
  text over a Ken Burns still can silently disappear. Any content that must sit
  above media/overlays gets `position: absolute; inset: 0` (+ `zIndex: 1` if needed)
  or an explicit `zIndex`. The color checks in §9 exist precisely to catch this.

## 7. Determinism & environment

A render is reproducible when: no `Math.random`/`Date`/locale APIs in render code
(seeded helpers in motion-patterns §0); fonts either self-hosted or network
availability is *declared*; Remotion pinned to an exact version with the lockfile
committed; same Chromium build (remotion's `browser ensure` pins it). Sound too:
both synthesis scripts are seeded — same arguments ⇒ byte-identical WAVs (sha256-
verified). Re-render the same frame twice and compare bytes if you need proof (the
conformance project does this).

## 8. Render & delivery presets

- Upload masters: `--codec h264 --crf 18` (platforms re-compress; give headroom).
- Archive: `--codec prores` if the user needs a grading master.
- Poster/thumbnail: `npx remotion still src/index.ts <CompId> artifacts/poster.png --frame <F>`.
- Fast iteration preview: render a GIF (`--codec gif --every-nth-frame 2`) or low-res
  mp4 first; also `npx remotion studio` and let the user scrub the draft.
- Storyboard for approval: `node scripts/storyboard.mjs artifacts/video.mp4
  artifacts/storyboard.png 0.5 4` — a contact sheet someone can approve in seconds.
- Heavy blur/transparency stacks: add `--image-format png` and render at target res
  only. Suspect motion? Render the same frame twice and diff; jitter means the
  easing is fighting itself.

## 9. Pre-delivery checklist

**Machine (always run — `scripts/verify-render.mjs`, see SKILL.md):**
- [ ] video exists, size sane
- [ ] duration ≈ spec (±0.6 s), fps ≈ spec
- [ ] audio stream present when sound was in scope; `volumedetect` max_volume < −1 dB
- [ ] stills at scene boundaries: decode, not blank, not flat, pairwise different
- [ ] brand-color presence on the frames that must show it (`--colors`, thresholds
      calibrated from observed absent/present counts, not picked from thin air)

**Visual (by a reviewer who can see — the model, a vision model, or the user):**
- [ ] text inside safe zones, nothing touches frame edges, nothing overflows
- [ ] no element visible before its entrance / after its exit (clamp check)
- [ ] ≤ 1 brand-hero/glowing element per frame; contrast floors hold
- [ ] fonts actually loaded (no system-fallback hero), no emoji anywhere
- [ ] holds read as deliberate stillness; breathing is imperceptible
- [ ] motion blur present on fast moves; cuts land where the shot list said
- [ ] SFX lead visuals; nothing clips (volumedetect)
- [ ] mix variant chosen (full / SFX-only) — or both delivered and the user picked
- [ ] listened to the mix once: bed present (if full), hits land, ticks don't
      machine-gun, music isn't fighting the VO (a listener with ears — model audio
      review, user, or you)
- [ ] rule-breaks from the delivery note are visibly intentional

Nothing ships as "verified" until the visual box is ticked by an entity with eyes.
