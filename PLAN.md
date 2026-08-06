# BOOM AI EDIT — Full Assessment & Finish Plan
*Prepared by your BCWA manager / dev partner — 2026-08-05 night shift*

## What you've built (the real foundation)

**Frontend (React + Vite + TypeScript + shadcn/ui):**
- 26 routed pages — a complete creator-platform UI
- Real Editor page (timeline, tracks, play controls, chat assistant)
- OneTapEdit, AiStudio (1,807 lines!), ScriptGenerator, ThumbnailGenerator, VideoDubbing, AIMusicGenerator, AutoUpload, BatchProcessor, TrendSync, Analytics, Dashboard, VoiceCloning, Agency, Marketplace, Community — all present
- Supabase auth + DB integration
- ElevenLabs integration planned (speech-to-text endpoint added)

**AI Worker (Python FastAPI) — REAL, working logic:**
- `/analyze/beats` — BPM + beat timing via librosa ✅ REAL
- `/analyze/scenes` — scene-change detection via PySceneDetect ✅ REAL
- `/generate/captions` — LLM hype captions, style-aware ✅ REAL (needs OPENAI_API_KEY)
- `/timeline/compile` — timeline JSON builder ✅ REAL
- Docker / Fly.io / Render deploy configs ready

## What's missing (the gaps to CapCut)

1. **NO actual video rendering.** The worker analyzes and compiles timelines, but nothing renders the final MP4 (no ffmpeg/moviepy/Remotion in the pipeline). This is THE core feature of a video editor — without it, users get JSON, not videos.
2. **Mock placeholders:** AIMusicGenerator (mock tracks), Agency (mock creators), ThumbnailGenerator (placeholder images), VideoDubbing (placeholder audio) — UI exists, real integrations don't.
3. **No caption burn-in** (we have this working in our BCWA ffmpeg pipeline!).
4. **No real auto-upload** to YouTube/TikTok/FB (needs platform APIs).
5. **No tests passing end-to-end** — needs verification.

## The plan (priority order)

### PHASE 1 — Make it render (the CapCut core)
- [ ] Add a **render engine** to ai-worker: ffmpeg-based compositor (we already run ffmpeg for BCWA — same skill)
- [ ] Wire `/timeline/compile` → actual MP4 output (concat clips, add music, burn captions, watermark)
- [ ] Status polling from the Editor (the `/status/:jobId` route already exists!)

### PHASE 2 — Make the mocks real
- [ ] AIMusicGenerator → real AI music API (Suno/Udio) or procedural stems
- [ ] ThumbnailGenerator → real image gen (we have FAL/FLUX via Nous!)
- [ ] VideoDubbing → ElevenLabs multilingual TTS (API key exists in .env)
- [ ] VoiceCloning → ElevenLabs clone (BCWA already has the "Hope" clone!)

### PHASE 3 — The moat (why it beats CapCut)
- [ ] **One-click "poster-style" template** — our proven BCWA format (backdrop + VO + captions + CTA) as a product feature
- [ ] **Auto-caption burn-in** from the transcript
- [ ] **"2 videos a day" batch flow** — the content-machine UX
- [ ] AI hook generator built in (we have the hook-generator skill!)

### PHASE 4 — Distribution
- [ ] Auto-upload to YouTube via API (OAuth)
- [ ] TikTok/FB later

## What I can do NOW (from this machine)
- I have ffmpeg + caption pipeline PROVEN (we built 6+ BCWA videos)
- I have ElevenLabs key + voice clone
- I have FAL image gen + FLUX 3 video gen via Nous
- I have the hook-generator + voice-builder skills
- I can code the ai-worker render endpoint (Python) and push to GitHub

## Reality check (honest)
- This machine: 1 core, 1 GB RAM, no GPU — can run ffmpeg rendering and small Python, but NOT heavy ML training or large builds. The AI worker is designed to run on Fly.io/Render — that's the right home for it.
- CapCut is 5+ years and a team ahead. We don't beat them on features — we beat them on **one thing done perfectly for one audience**: AI-assisted short-form for blue-collar creators. That's the wedge.

## First concrete step (my pick)
Add the **ffmpeg render endpoint** to ai-worker (`/render`) that takes a compiled timeline + clips and outputs an MP4 with burned captions. It's the single feature that turns this from "a dashboard" into "a video editor."
