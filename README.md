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

- *"Make a 15s promo for my app launch"*
- *"Intro/outro for my YouTube channel"*
- *"This render looks generic — fix the motion"*

On a desktop harness you get a rendered `.mp4`. On mobile / chat-only apps
MotionCraft cannot render — it says so and delivers the **mobile kit** instead:
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
   eyes; at most 3 fix loops.
6. **Deliver** — an honest note: what was machine-checked, what was seen, and
   what remains `UNVERIFIED-VISUALLY` if you could not see it.

Principles P1–P10 live in `SKILL.md`; palettes/type/rhythm/sound detail in
`references/design-rules.md`; copy-paste scene recipes (byte-identical to code
that compiled and rendered in a conformance project) in
`references/motion-patterns.md`.

---

## Install & setup

A skill is just a folder containing `SKILL.md` — installing MotionCraft means
putting that folder where your agent looks for skills. Rendering additionally
needs a desktop with Node and a browser (see Requirements below).

### 1) One-command install (any agent that supports the `skills` CLI)

```bash
npx skills add <your-github>/motioncraft --agent claude-code
# other agents: --agent cursor, --agent codex, --agent gemini, ...
```

### 2) Manual — Claude Code (recommended default)

Personal scope (every project on this machine):

```bash
# macOS / Linux
mkdir -p ~/.claude/skills
git clone https://github.com/<your-github>/motioncraft ~/.claude/skills/motioncraft
# …or copy the folder instead:
# cp -r motioncraft ~/.claude/skills/
```

```powershell
# Windows (PowerShell)
mkdir -p $HOME\.claude\skills
git clone https://github.com/<your-github>/motioncraft $HOME\.claude\skills\motioncraft
```

Project scope (only this repo uses it): put the folder at
`.claude/skills/motioncraft/` inside the project and commit it.

### 3) Manual — other agents (same rule, different folder)

Skills are the same open format everywhere; only the location changes.

| Agent | Global folder | Project folder |
|---|---|---|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Cursor | `~/.cursor/skills/` | `.cursor/skills/` |
| Windsurf | `~/.windsurf/skills/` | `.windsurf/skills/` |
| Codex | `~/.agents/skills/` | `.agents/skills/` |
| Cline | `~/.cline/skills/` | `.cline/skills/` |
| Roo Code | `~/.roo-code/skills/` | `.roo-code/skills/` |
| Gemini CLI | `~/.gemini/skills/` | `.gemini/skills/` |
| GitHub Copilot | — | `.github/copilot/skills/` |

Clone or copy the `motioncraft` folder into the global or project folder of your
agent. When in doubt, use the global folder.

### 4) Install from the `.skill` zip

```bash
unzip motioncraft.skill -d ~/.claude/skills/
```

The zip unpacks to `~/.claude/skills/motioncraft/SKILL.md`. If your app accepts
`.skill` uploads directly (claude.ai — see below), skip the terminal entirely.

### 5) claude.ai and mobile apps (no terminal)

1. On **claude.ai** (desktop browser or app): open **Settings → Capabilities**
   and enable *Code execution and file creation*, then **Customize → Skills**
   and toggle **MotionCraft** on. Upload `motioncraft.skill` if your plan offers it.
2. On the **iOS/Android app**: skills you enable on claude.ai sync to the app
   (uploading files from the phone app itself may be unavailable — do step 1 on
   a desktop browser once).
3. **Chat-only surfaces / phones without a skill system:** no install needed —
   MotionCraft is just text. Ask for a video anyway: it scopes the idea, writes
   the complete project as ready-to-copy text, and gives you the exact commands
   to render on any desktop (mobile kit). The render itself needs a desktop.

### Verify the install

On a desktop harness, start a new session and ask: *"Make a 10s logo intro for
my channel"* — you should get a scoped plan, then a rendered `.mp4`.

### Updating

```bash
git -C ~/.claude/skills/motioncraft pull        # git install
npx skills update motioncraft --agent claude-code   # CLI install
```

### Troubleshooting

- **Skill not listed** → restart the session; the folder must be named exactly
  `motioncraft` with `SKILL.md` directly inside it (not nested one level deeper).
- **Zip did nothing** → it must unpack to `<skills-dir>/motioncraft/SKILL.md`.
  If your tool flattened the folder, re-unzip into a `motioncraft/` folder.
- **Render fails to start** → run `npx remotion browser ensure`, then retry; on
  bare Linux also install the Chromium system libs listed in `SKILL.md` §2.
- **Phone app says it cannot render** → that is expected; ask for the mobile kit
  and run the commands it returns on any desktop machine.

---

## Requirements

| Capability | Needed for | If missing |
|---|---|---|
| Shell + filesystem | install, render | **cannot render** → mobile kit / advisory path |
| Node ≥ 18 + npm | everything | same as above |
| Chromium | rendering | `npx remotion browser ensure` |
| Image reading | final visual sign-off | machine checks, then `UNVERIFIED-VISUALLY` + ask |
| Network | Google Fonts at render time | self-host fonts into `public/fonts/` |

## Repository layout

```
motioncraft/                  ← repo root (clone into ~/.claude/skills/motioncraft)
├── SKILL.md                  ← the skill contract (frontmatter name: motioncraft)
├── README.md                 ← this file
├── LICENSE                   ← MIT open-source license (put your name on the copyright line)
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

MIT — see `LICENSE`.
