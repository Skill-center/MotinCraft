# 🎬 MotionCraft

**Code-driven motion graphics with Remotion — craft over generic, verified before
delivery.**

MotionCraft turns one sentence into a designed, rendered motion-graphics video:
logo stings, intros/outros, Reels/Shorts/promos, kinetic type, animated captions,
product launches — and de-generic-AI-ing existing Remotion renders.

It encodes the craft that separates *designed* motion from "generic AI output":
named easing and springs, staggered entrances as events, planned holds, layered
composition, theme discipline, deterministic renders — every rule with its why
and its carve-outs. Nothing ships unseen: machine checks run, a visual pass signs
off, and the delivery note says exactly what was verified and what wasn't.

## Try it

| English | فارسی |
|---|---|
| *"Make a 15s promo for my app launch"* | *«یه موشن گرافیک باحال برام بساز»* |
| *"Intro/outro for my YouTube channel"* | *«اینترو و تیزر برام بساز»* |
| *"This render looks generic — fix the motion"* | *«این ویدیو رو حرفه‌ای‌تر کن»* |

On a desktop harness you get a rendered `.mp4`. On mobile / chat-only apps
MotionCraft can't render — it says so and delivers the **mobile kit** instead:
scene table, the complete project as text, exact commands, and a checklist to
run on any desktop.

## How it works

1. **Scope** — canvas, fps, duration, scene table (you approve it first).
2. **Preflight** — node, browser, fonts, image-reading capability.
3. **Setup** — one scaffold command or a pinned manual install
   (`remotion@4.0.522`, committed lockfile).
4. **Build** — scenes from proven, tested motion patterns; one theme import per
   scene; deterministic music/SFX kits; audio score declared as data.
5. **Render & verify** — machine checks (`scripts/verify-render.mjs`: silence,
   loudness, brand colors, no system fonts), then a visual pass by someone with
   eyes; ≤ 3 fix loops.
6. **Deliver** — honest note: what was machine-checked, what was seen, what
   remains `UNVERIFIED-VISUALLY` if you couldn't see it.

Principles P1–P10 live in `SKILL.md`; palettes/type/rhythm/sound detail in
`references/design-rules.md`; copy-paste scene recipes (byte-identical to code
that compiled and rendered in a conformance project) in
`references/motion-patterns.md`.

## Requirements

| Capability | Needed for | If missing |
|---|---|---|
| Shell + filesystem | install, render | **cannot render** → mobile kit / advisory path |
| Node ≥ 18 + npm | everything | same as above |
| Chromium | rendering | `npx remotion browser ensure` |
| Image reading | final visual sign-off | machine checks, then `UNVERIFIED-VISUALLY` + ask |
| Network | Google Fonts at render time | self-host fonts into `public/fonts/` |

## Install

**Claude Code (per-user):**
```bash
git clone https://github.com/<you>/motioncraft ~/.claude/skills/motioncraft
# or copy the folder:
# cp -r motioncraft ~/.claude/skills/
```

**Claude Code (per-project):** put it in `.claude/skills/motioncraft/`.

**Any shell-capable agent:** copy the folder into that agent's skills directory —
`SKILL.md` is the open agent-skills format.

**Mobile / chat-only:** install may be impossible — use the mobile kit flow by
asking for a video anyway; MotionCraft will scope, write the whole project as
text, and hand you desktop commands.

## Repository layout (upload these)

```
motioncraft/                  ← repo root (clone into ~/.claude/skills/motioncraft)
├── SKILL.md                  ← the skill contract (frontmatter name: motioncraft)
├── README.md                 ← this file
├── LICENSE                   ← MIT (adjust the holder line)
├── assets/
│   └── theme.ts              ← theme template (colors, fonts, easing, springs, fr())
├── references/
│   ├── design-rules.md       ← color/type/rhythm/sound system with carve-outs
│   └── motion-patterns.md    ← tested scene recipes (code + rationale)
├── scripts/
│   ├── scaffold.mjs          ← fast path: theme, scripts, pinned package.json, Root skeleton
│   ├── storyboard.mjs        ← contact sheets from a rendered video
│   ├── synth-sfx.mjs         ← deterministic SFX kit generator
│   ├── synth-music.mjs       ← deterministic music-bed generator
│   └── verify-render.mjs     ← machine checks (silence, loudness, colors, fonts)
└── LIMITATIONS.md            ← honest boundaries
```

## License

MIT — see `LICENSE`. Rendered videos are yours.
