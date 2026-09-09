# Limitations — read before promising anything

This skill is deliberately loud about what it CANNOT do, because the failure mode of
video tools is silent over-promising.

## Platform limits
- **Needs a shell with node/npm + a browser (Chromium).** Claude Code and other
  shell-capable agents can run the full loop. Claude Desktop/web apps load the
  skill as knowledge only — no npm, no render, no verification. **Mobile apps
  cannot install skills at all.** On those surfaces the correct behavior is to say
  "I can't render here" and offer the advisory path (code + commands to run on a
  computer), never to imply a video was produced.
- **Visual and audio review need real senses.** Machine checks (verify-render.mjs)
  prove presence/consistency (duration, fps, audio stream, not-blank/not-flat
  stills, brand color at expected frames, no clipping). They cannot prove the video
  is beautiful, well-paced, or that the mix sounds good. Anything not looked at by
  an entity with eyes is tagged `UNVERIFIED-VISUALLY`; anything not listened to is
  reported as machine-checked audio only.

## Skill-content limits
- **One demonstrated aesthetic.** The rules and examples encode a premium
  dark-tech motion language (springs, holds, grade/grain/vignette). They are craft
  guardrails, not universal laws; the skill's P10 requires breaking them *in
  writing* when a brand or style needs something else. Only two palettes ship with
  computed contrast ratios; new palettes need their own checks.
- **Captions need real input.** The caption pattern is render-verified with a
  synthetic transcript; real use requires a transcriber (Whisper or
  `@remotion/install-whisper-cpp`) producing per-word timestamps.
- **The music generator is a sketch, not a composer.** `synth-music.mjs` produces a
  deterministic, beat-grid-locked placeholder bed (Am→F→C→G). Real music from the
  user is better; say so when you use the placeholder.
- **Determinism has a network asterisk.** Pixels and audio are byte-reproducible
  when `@remotion/google-fonts` has network access (fonts are fetched at render
  time). For fully offline byte-reproducibility, self-host fonts (design-rules §2).
- **Render cost is real.** Frame-by-frame React rendering at 1080×1920 costs ~1–2
  minutes per 5 s of video on a normal machine (conformance measured ~2 min).
  Long-form or real-time work belongs in an NLE; stills/GIF/storyboard previews are
  the cheap iteration path.

## Licensing
- Remotion is **source-available, not open source**: free for individuals and
  companies of up to 3 people (including commercial use); for-profit companies
  above that need a paid license (remotion.dev). This skill is MIT, but it renders
  with Remotion — check your entitlement before shipping commercial work.
- Everything this skill synthesizes (fonts, sounds, code) is either MIT/self-made
  or declared; no asset files are downloaded at runtime.
