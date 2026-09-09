---
name: motioncraft
description: "Create and edit code-driven motion graphics videos with Remotion (React to MP4): logo stings, intros/outros, Reels/Shorts/promos, kinetic type, animated captions over footage, product/launch videos, and de-generic-AI-ing an existing Remotion render. Trigger words include video, motion graphics, animation, make a video, make an intro, reel, clip, موشن گرافیک بساز، ویدیوی متحرک بساز، اینترو بساز، تیزر بساز، ویدیو بساز، کپشن متحرک، آرم متحرک، render, Ken Burns, and any Remotion project edit. Desktop harnesses with a shell (node+npm, a browser for rendering, and image reading) run the full loop and deliver a rendered mp4. On harnesses without a shell (mobile apps, chat-only surfaces) it cannot render — say so up front, then deliver the mobile kit: scene table, complete project source as text (one fenced block per file), exact desktop commands, and the post-render checklist. Always read SKILL.md before writing Remotion code."
---

# MotionCraft

Code quality is rarely the bottleneck in AI-made video — **motion-design craft is**:
untuned easing, opacity-only fades, simultaneous entrances, flat colors and no
texture are what make output read "generic AI". This skill encodes the craft as a
small set of principles with carve-outs, plus a mandatory verify loop so nothing is
delivered unseen.

This rewrite is **self-consistent by construction**: principles, patterns and the
checklist use one vocabulary; every pattern in `references/motion-patterns.md` is
byte-identical to code that was compiled and rendered in the conformance project
(`remotion@4.0.522`); machine checks are executable, visual checks are owned by a
reviewer who can see.

---

## 1. What this skill needs — check before promising anything

| Capability | Needed for | If missing |
|---|---|---|
| Shell + filesystem | npm install, remotion render | **cannot render.** Advisory-only: describe the edit, give the code/commands, do not claim a video |
| Node ≥ 18 + npm | everything | same as above |
| Chromium | rendering | auto-download via `npx remotion browser ensure`; on bare Linux also: `apt-get install -y libnspr4 libnss3 libasound2` (or the playwright `chromium_headless_shell` fallback, §8) |
| Network | google-fonts at render time | self-host fonts into `public/fonts/` first (design-rules §2) |
| Image reading (model, vision model, or user) | **final visual sign-off** | run machine checks, then deliver tagged `UNVERIFIED-VISUALLY` and ask for a look — never claim visual verification you didn't do |
| ffmpeg/ffprobe (optional) | machine checks | checks degrade gracefully; `scripts/verify-render.mjs` reports what it could not check |

Platform truth: skills are a folder of markdown+scripts. Claude Code (and other
harnesses that read SKILL.md and can run shells) can do the full loop. Desktop/web
apps and **mobile apps cannot run this workflow** — on those, install may be
impossible or the skill only *advises*; say so plainly instead of implying an
impossible render.

**Mobile / chat-only kit (no shell, one prompt).** Say plainly that the mp4 cannot
be rendered in this session, then deliver in order: (1) a one-line spec plus the
scene table, so the user approves the idea before you write code; (2) the complete
project as text — one fenced block per file with its path as a comment (theme,
Root, scenes, package.json with exact versions); (3) the exact commands to
scaffold, install and render on a desktop; (4) the post-render verify checklist;
(5) an SVG storyboard sketch of key frames, labeled as a sketch — never as a
render. Then offer: "paste this into Claude Code on any desktop and I will render
it." The full workflow resumes normally on a shell harness.

## 2. Principles (P1–P10)

The contract. Detail and carve-outs live in `references/design-rules.md`.

- **P1 — Intent over default.** Every timed value names its easing or spring config.
  Linear is legal only as a commented choice (constant-speed pan, dissolve).
  `extrapolateLeft/Right: "clamp"` wherever a value must not leave its range.
- **P2 — Entrances are events.** 2–3 properties move together (opacity + rise +
  scale…); siblings stagger via `fr(fps, seconds)` offsets; exits exist, are faster
  than entrances, and aim the eye at the next beat.
- **P3 — Rhythm is contrast.** Planned holds with *zero* motion are features.
  Breathing is reserved for elements idle > 2 s outside holds, amplitude ≤ 1.5%.
- **P4 — Compose in layers.** Background interest → assets → type/graphics → grade →
  finish (grain+vignette). Flat is a deliberate style choice, never the default.
- **P5 — Media moves.** Every still gets eased, edge-safe Ken Burns; footage uses
  `<OffthreadVideo>`; speech gets captions; audio is designed, never accidental.
- **P6 — Time derives from fps.** Seconds → frames only via `fr(fps, s)`; one TIMING
  object per composition; no orphan frame numbers anywhere.
- **P7 — Theme discipline.** Brand tokens in one `theme.ts`; diegetic palettes are
  allowed as named colocated exports with a reason; stray literals are not. ≤ 1
  brand/glow hero per frame. Icons are SVG, never emoji.
- **P8 — Deterministic by default.** No `Math.random`/`Date`/locale APIs in render
  code; seeded helpers only. Fonts self-hosted or network declared. Pin Remotion and
  commit the lockfile.
- **P9 — Verify before deliver.** Machine checks always, then a visual pass by
  someone with eyes, fix ≤ 3 loops, then deliver with an honest note.
- **P10 — Break rules out loud.** When a principle doesn't fit, break it *in
  writing*: comment at the call site + one line in the delivery note.

## 3. Workflow

### Step 1 — Scope and shot list (before any code)
Determine canvas (1080×1920 for Reels/Shorts, 1920×1080 landscape, 1080×1080 square),
fps (30 default; 60 only for genuinely fast motion), duration, audio needs, and
existing assets. **Write the scene table** — per scene: content, seconds, beats,
transition — and get user sign-off if the piece is > 15 s or brand-critical.
New video vs edit-of-existing: see §4 before touching other people's code.

### Step 2 — Preflight
- `node --version` ≥ 18; `npx remotion browser ensure` (handles Chromium download).
- Bare Linux without the browser: `apt-get install -y libnspr4 libnss3 libasound2`;
  if Chrome errors "Old Headless mode removed", point `--browser-executable` at a
  Playwright `headless_shell` binary (find: `ls /opt/pw-browsers …/headless_shell`).
- ffprobe optional; fonts: network or self-host (§1).
- Am I able to see images in this session? Record yes/no in the delivery note now.

### Step 3 — Setup
Fast path (scaffolds theme, scripts, pinned package.json, Root skeleton):
```bash
node <skill>/scripts/scaffold.mjs my-video 5 30 1080 1920
cd my-video && npm install && npm run audio && npx remotion studio src/index.ts
```
Manual path:
```bash
npm init -y
npm i remotion@4.0.522 @remotion/cli@4.0.522 react react-dom @remotion/google-fonts
# only if needed: @remotion/transitions @remotion/motion-blur @remotion/captions
mkdir -p src/components src/scenes public
cp <skill>/assets/theme.ts src/theme.ts          # then adjust palette to the brand
cp <skill>/scripts/synth-sfx.mjs scripts/        # deterministic SFX kit
cp <skill>/scripts/synth-music.mjs scripts/      # deterministic music bed
cp <skill>/scripts/verify-render.mjs scripts/    # machine checks
cp <skill>/scripts/storyboard.mjs scripts/       # contact sheets
node scripts/synth-sfx.mjs public/sfx 16         # kit + pad<16>.wav
node scripts/synth-music.mjs public/sfx/track.wav 120 8 45 20260908
```
Find `<skill>` via the install location (`~/.claude/skills/motioncraft`
or the per-project `.claude/skills/…`; if the scripts aren't found, fall back to the
inline commands in §6 — they are the same checks). Structure:
`src/index.ts` (registerRoot) → `src/Root.tsx` (Compositions + TIMING object) →
`src/scenes/*.tsx` → `src/components/*.tsx`; user assets in `public/` via
`staticFile()`. Commit `package-lock.json` (P8).

### Step 4 — Build
Read `references/motion-patterns.md` and compose scenes from those components; read
`references/design-rules.md` for palettes/type/rhythm/sound. Convert every second to
frames with `fr(fps, s)`. Respect P7: one theme import per scene file; anything that
isn't theme is a named, justified palette. Declare the audio score (one events array
per composition — motion-patterns §13). Write the delivery-note draft (claims you
will be able to back up).

### Step 4.5 — Draft with the user (before the expensive render)
Run `npx remotion studio src/index.ts` and let the user scrub scenes at 0.25×–1×
(easing flaws invisible at 1× show up at quarter speed). For long renders, offer a
GIF preview (`--codec gif --every-nth-frame 2`) or a storyboard contact sheet
(`node scripts/storyboard.mjs <draft.mp4> storyboard.png 0.5 4`) for sign-off.
**Ask the audio question early**: full mix (music bed under the piece) or an
SFX-only/clean master? If they are undecided, render BOTH — one composition, one
`music` boolean prop, two registered Compositions (see motion-patterns §13), and let
the user pick after listening.

### Step 5 — Render
```bash
npx remotion render src/index.ts <CompId> artifacts/video.mp4 --codec h264 --crf 18
```

### Step 6 — Machine verification (always)
Stills at scene boundaries + one mid-scene frame, then the checker — including
brand-color presence on frames that must show the hero color:
```bash
for f in <boundary frames>; do
  npx remotion still src/index.ts <CompId> artifacts/check_$f.png --frame $f --overwrite
done
node scripts/verify-render.mjs artifacts/video.mp4 \
  --expect-audio --duration 5.0 --fps 30 \
  --stills artifacts/check_0.png,artifacts/check_45.png,... \
  --colors artifacts/check_45.png=#7C3AED:300   # hero color, calibrated threshold
```
Fix anything it flags, re-render, re-check. Calibrate `--colors` thresholds from
observed counts (absent ≈ 0–15 px, present ≫ that) — never from thin air. When audio
matters also run `ffmpeg -i artifacts/video.mp4 -af volumedetect -f null -` (`max_volume`
above −1 dB = clip risk). The color check is what catches content silently painted
under a positioned media layer — stills can be "not blank" while the hero is
invisible (this happened in conformance v1; the check caught it).

### Step 7 — Visual verification (mandatory, by eyes + ears)
Look at the stills (or the storyboard contact sheet) for: safe-zone/overflow, clamp
leaks (visible before entrance), hero-color/glow count per frame, font fallbacks,
emoji, blur-on-fast-moves, cut placement. **Listen to the mix once** — bed present,
hits land on the beats, ticks don't machine-gun, nothing clips. Fix → re-render →
re-extract → re-look. **Max 3 loops**, then bring the user in with what you found.
If you cannot see images: deliver tagged `UNVERIFIED-VISUALLY` with the still paths
and the checklist — that is not failure, that is honesty. If you cannot listen:
say the audio was machine-checked but not ear-checked.

### Step 8 — Deliver
MP4 path(s), duration/fps/codec, which mix variant(s) were produced (full /
SFX-only / both) and the user's pick if they made one, what was machine-checked,
what was visually checked and by whom, deliberate rule-breaks (P10), and the note if
any step was skipped.

## 4. Editing an existing Remotion project
Conservative by default — other people's code is not your style canvas:
1. **Audit read-only**: read `src/`, note theme file(s), the TIMING object, and which
   principles are violated and where.
2. **Propose**: a short list of what you'd change and why, and ask before refactoring
   anything beyond the requested edit. Refactoring violations is *offered*, never
   assumed.
3. **Minimal diff**: fix functional bugs first, then the requested change, then only
   the approved style items. Preserve the author's structure unless they asked you to
   re-theme it. Never rewrite a whole file to satisfy a principle the author never
   opted into.

## 5. When NOT to use this skill
- A quick cut/trim/compress/crop of existing footage with no graphics: use ffmpeg
  directly (this stack costs a Chromium download and minutes per render).
- Multi-cam / long-form live-action editing: that's an NLE's job, not frame-by-frame
  React.
- Real-time or > ~3 min deliverables where render cost explodes: say so before
  starting; propose still-based previews and a single final render.
- Users on mobile/chat-only harnesses: deliver the mobile kit (§1) — no renders promised.

## 6. Fallback machine checks (no verify-render.mjs available)
```bash
ffmpeg -i artifacts/video.mp4 2>&1 | grep -E "Duration|Stream"   # duration/fps/audio present
# blank/flat-frame test on one still:
ffmpeg -i check.png -vf scale=8:8 -pix_fmt rgb24 -f rawvideo - | python3 -c \
  "import sys;b=sys.stdin.buffer.read();print('mean',sum(b)/len(b),'std',(sum(x*x for x in b)/len(b)-(sum(b)/len(b))**2)**.5)"
# (mean 5–250 and std ≥ 2 = not blank/flat)
```

## 7. Failure modes (check in this order)
1. Browser won't launch → §2 preflight (deps, headless_shell, `browser ensure`).
2. Blank/stale stills → `--overwrite` missing, or wrong frame range (frame must be
   < composition duration).
3. Dead air at scene ends → `durationInFrames` vs content mismatch (P6): recompute
   the TIMING table; remember TransitionSeries total = Σ scenes − Σ transitions
   (motion-patterns §12).
4. Audio missing/silent → `<Audio>` not inside a mounted Sequence, volume 0, or file
   missing in `public/`; check with volumedetect.
5. Text looks "default" → font didn't load (network/family typo) — always the first
   suspect for fallback type.
6. Layout shifted between still and render → em-gap trap or unclamped interpolate
   (P1/P7).
7. Determinism doubt → re-render one frame twice and diff bytes (P8).
8. Visual bugs you can't diagnose from code → render the motion at low fps and step
   through stills every 3–5 frames around the suspect window.
9. "Content missing but stills look fine" → positioned-layer paint order (media
   over static text, design-rules §6): verify with the `--colors` brand check.
10. Audio feels empty/static → check the mix: music bed present (`synth-music.mjs`),
    SFX lead ~3 frames, ticks alternated (tick/tick2), volumedetect max < −1 dB;
    if you can't hear it, say it's machine-checked only. If the user found a mix
    too busy/too bare, re-mix (fewer events, or swap full ↔ SFX-only) rather than
    just re-rendering the same score.

## 8. Reference files
- `references/motion-patterns.md` — render-verified components + usage (entrances,
  stagger, word reveal, icons, bg mesh, grade/grain/vignette, Ken Burns, counter,
  spark, exits, breathing, motion blur, transitions, sound, captions).
- `references/design-rules.md` — color/type/rhythm/sound/media system, determinism,
  render presets, the two-tier pre-delivery checklist.
- `assets/theme.ts` — theme template (colors, fonts, ease, springs, time) + `fr()`.
- `scripts/synth-sfx.mjs` — deterministic SFX/pad kit (whoosh, riser, pop, tick,
  tick2, bass, impact, shimmer, pad<N>).
- `scripts/synth-music.mjs` — deterministic music bed (bpm/key/duration/seed,
  chord-progression arrangement with a real beat grid).
- `scripts/verify-render.mjs` — machine verification (duration/fps/audio/stills +
  brand-color presence).
- `scripts/storyboard.mjs` — contact-sheet stills grid for fast approval.
- `scripts/scaffold.mjs` — one-command project start (pinned deps, theme, scripts,
  Root skeleton).

## 9. Definition of done
The delivery note states: scene table honored; machine checks all PASS (or listed
as skipped with reason); stills visually reviewed by <reviewer>; deliberate
rule-breaks documented; file metadata (duration/fps/codec/audio) matches the spec.
A render without the visual box ticked is `UNVERIFIED-VISUALLY`, never "done".
