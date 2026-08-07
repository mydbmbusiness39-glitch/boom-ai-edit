# BOOM AI EDIT — Full Assessment & Finish Plan
*Prepared by your BCWA manager / dev partner — 2026-08-05 night shift (updated 2026-08-06)*

## 🎯 THE VISION (user-stated, 2026-08-06)
"Implement pricing until we go from there. I will deploy it when everything is professional done by you to Google and Apple. See the vision?" — **boom-ai-edit is destined for the App Store + Google Play.** Professional polish is the gate to deployment. Everything below serves that.

## 💰 PRICING STRATEGY (decided)

### Phase 1 (now, web/soft-launch): Paid-only tiers
- **Free:** 1 project, watermark, 5 renders/month (taste only)
- **Pro — $19.99/mo:** unlimited renders, no watermark, AI captions, poster templates, all AI tools
- **Business — $49/mo:** everything in Pro + team seats (3), white-label export, priority render queue
- **Why paid-first:** no free-rider server costs at small scale; every user is real money; business pricing is less price-sensitive. Switch to freemium only at scale (CapCut model).

### Phase 2 (App Store/Play launch): Store-native billing
- **Pro $19.99/mo or $99.99/yr** (Apple IAP + Google Play Billing)
- **Free tier returns** with watermark (the storefront marketing engine)
- RevenueCat or store SDKs for cross-platform billing

### The wedge (what beats CapCut)
AI short-form poster videos for blue-collar creators/business owners — one-click "poster format" template + auto-captions + AI hook generator. Nobody owns "AI video for the trades."

## 🗺️ ROADMAP TO APP STORE (priority order)

### PHASE 1 — Make it render (the CapCut core) ✅ IN PROGRESS
- [x] **ffmpeg render engine** (`ai-worker/renderer.py`) — timelines → real MP4: video clips, images, text burn-in, audio mix. TESTED ✅ (real footage render verified)
- [x] **`/render` endpoint** in `main.py`
- [x] Test suite `test_render.py` (passing)
- [ ] Wire `/render` into the frontend Editor (status polling exists at `/status/:jobId`)
- [ ] Render jobs: queue + progress + cancellation

### PHASE 2 — Make the mocks real
- [ ] AIMusicGenerator → real AI music API (Suno/Udio) or procedural stems
- [ ] ThumbnailGenerator → real image gen (FAL/FLUX via Nous)
- [ ] VideoDubbing → ElevenLabs multilingual TTS (key exists in .env)
- [ ] VoiceCloning → ElevenLabs clone (BCWA already has the "Hope" clone!)

### PHASE 3 — The moat (why it beats CapCut)
- [ ] **One-click "poster-style" template** — our proven BCWA format as a product feature
- [ ] **Auto-caption burn-in** from transcript
- [ ] **"2 videos a day" batch flow** — content-machine UX
- [ ] AI hook generator built in (we have the hook-generator skill!)

### PHASE 4 — Distribution
- [ ] Auto-upload to YouTube via API (OAuth)
- [ ] TikTok/FB later

### PHASE 5 — STORE LAUNCH (the goal)
- [ ] PWA → Android (TWA) + iOS (WKWebView) wrappers OR React Native/Capacitor port
- [ ] Apple IAP + Google Play Billing integration (RevenueCat recommended)
- [ ] Store assets: icons, screenshots, descriptions
- [ ] App Store + Play Store submissions
- [ ] Privacy policy + terms pages

## What I can do NOW (from this machine)
- ffmpeg + caption pipeline PROVEN (6+ BCWA videos)
- ElevenLabs key + voice clone
- FAL image gen + FLUX 3 video gen via Nous
- hook-generator + voice-builder skills
- Can code render endpoint + pricing page + push to GitHub

## Reality check (honest)
- This machine: 1 core, 1 GB RAM, no GPU — runs ffmpeg + small Python, not heavy ML or large builds. AI worker designed for Fly.io/Render — that's its home.
- CapCut is 5+ years and a team ahead. We beat them on ONE thing done perfectly: AI-assisted short-form for blue-collar creators.

## First concrete steps (in progress)
1. ✅ Render engine built + tested
2. ⏳ Pricing page (Free/Pro/Business tiers) — building now
3. ⏳ Push to GitHub once token access fixed

