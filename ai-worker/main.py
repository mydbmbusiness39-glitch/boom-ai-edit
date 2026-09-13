from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import librosa
import numpy as np
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
import tempfile
import os
import json
from typing import List, Dict, Any, Optional
import requests
import subprocess
from datetime import datetime
from media_resolver import resolve_media, cleanup_temp, exact_host_validator

# Gate #69: durable async render via Cloud Tasks (OIDC), GCP-side only (ADC, no key export)
import google.auth
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as oidc_id_token
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2

app = FastAPI(title="AI Video Worker", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AI_WORKER_URL = os.getenv("AI_WORKER_URL", "http://localhost:8000")

# Gate #58: server-to-server bearer auth for production reachability.
# Secret lives ONLY in worker env (AI_WORKER_API_KEY). Never in frontend.
# Absent/invalid token -> 401. Constant-time compare. Token never logged.
import hmac
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_WORKER_API_KEY = os.getenv("AI_WORKER_API_KEY", "")
_bearer_scheme = HTTPBearer(auto_error=False)

def require_worker_auth(creds: HTTPAuthorizationCredentials = Depends(_bearer_scheme)):
    # No key configured -> auth disabled (dev/local mode, fail-open is intentional
    # for local canaries; production MUST set AI_WORKER_API_KEY).
    if not _WORKER_API_KEY:
        return True
    if creds is None or creds.credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    if not hmac.compare_digest(creds.credentials, _WORKER_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid bearer token")
    return True

# Request/Response models
class BeatsResponse(BaseModel):
    bpm: float
    beats: List[float]
    tempo_confidence: float

class Scene(BaseModel):
    start: float
    end: float
    score: float

class ScenesResponse(BaseModel):
    scenes: List[Scene]
    total_duration: float

class CaptionRequest(BaseModel):
    style: str = "rgb"  # rgb or lux
    duration: int = 20
    context: str = ""

class CaptionsResponse(BaseModel):
    captions: List[str]
    style: str

class TimelineItem(BaseModel):
    id: str
    type: str  # video, audio, image, text
    start_time: float
    end_time: float
    track: int
    content: Dict[str, Any]
    effects: List[Dict[str, Any]] = []

class TimelineRequest(BaseModel):
    items: List[TimelineItem]
    duration: float
    fps: int = 30
    resolution: Dict[str, int] = {"width": 1080, "height": 1920}  # 9:16 aspect ratio

class TimelineResponse(BaseModel):
    timeline: Dict[str, Any]
    render_config: Dict[str, Any]
    estimated_render_time: float

@app.get("/")
async def root():
    return {
        "service": "AI Video Worker",
        "version": "2.0.0",
        "status": "ready",
        "endpoints": [
            "/",
            "/health",
            "/analyze/beats",
            "/analyze/scenes",
            "/generate/captions",
            "/timeline/compile",
            "/render",
            "/enqueue",
            "/task-render"
        ]
    }

@app.post("/analyze/beats", response_model=BeatsResponse)
async def analyze_beats(file: UploadFile = File(...), _auth: bool = Depends(require_worker_auth)):
    """Analyze audio/video file for BPM and beat positions using librosa.
    Video inputs are auto-converted to mono 44.1kHz WAV via the worker's
    existing FFmpeg installation before analysis."""
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file upload")

        suffix = os.path.splitext(file.filename or "")[1].lower()
        looks_like_video = (
            (file.content_type or "").startswith("video/")
            or suffix in {
                ".mp4", ".mov", ".webm", ".avi", ".mkv",
                ".flv", ".wmv", ".m4v", ".mpg", ".mpeg",
            }
        )

        input_path = None
        wav_path = None
        try:
            if looks_like_video:
                fd_in, input_path = tempfile.mkstemp(suffix=".input_video")
                with os.fdopen(fd_in, "wb") as f:
                    f.write(content)

                fd_out, wav_path = tempfile.mkstemp(suffix=".wav")
                os.close(fd_out)

                cmd = [
                    "ffmpeg",
                    "-i", input_path,
                    "-vn",
                    "-ac", "1",
                    "-ar", "44100",
                    "-f", "wav",
                    wav_path,
                    "-y",
                ]
                try:
                    subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                except subprocess.TimeoutExpired:
                    raise HTTPException(status_code=500, detail="Audio extraction timed out")
                except FileNotFoundError:
                    raise HTTPException(status_code=500, detail="FFmpeg is not available on the worker")

                if not os.path.exists(wav_path) or os.path.getsize(wav_path) == 0:
                    raise HTTPException(status_code=400, detail="No audio track found in video")

                analysis_input = wav_path
            else:
                fd_in, input_path = tempfile.mkstemp(suffix=".wav")
                with os.fdopen(fd_in, "wb") as f:
                    f.write(content)
                analysis_input = input_path

            # Load audio with librosa
            y, sr = librosa.load(analysis_input)
            
            # Extract tempo and beats
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
            
            # Calculate tempo confidence
            onset_envelope = librosa.onset.onset_strength(y=y, sr=sr)
            tempo_confidence = float(np.std(librosa.feature.tempogram(
                onset_envelope=onset_envelope, sr=sr
            )))
            
            return BeatsResponse(
                bpm=float(tempo),
                beats=beats.tolist(),
                tempo_confidence=tempo_confidence
            )
            
        finally:
            for path in {input_path, wav_path}:
                if path and os.path.exists(path):
                    try:
                        os.unlink(path)
                    except OSError:
                        pass
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Beat analysis failed: {str(e)}")

def _detect_scenes(video_path: str) -> ScenesResponse:
    """Run PySceneDetect over a LOCAL video file path. Shared by both the
    multipart-upload path and the resolver-backed URL path."""
    video_manager = VideoManager([video_path])
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=30.0))
    video_manager.start()
    scene_manager.detect_scenes(frame_source=video_manager)
    scene_list = scene_manager.get_scene_list()
    scenes = []
    for scene in scene_list:
        start_time = scene[0].get_seconds()
        end_time = scene[1].get_seconds()
        score = min(1.0, (end_time - start_time) / 10.0)
        scenes.append(Scene(start=start_time, end=end_time, score=score))
    total_duration = video_manager.get_duration()[0].get_seconds()
    return ScenesResponse(scenes=scenes, total_duration=total_duration)


@app.post("/analyze/scenes", response_model=ScenesResponse)
async def analyze_scenes(file: UploadFile = File(None), url: str = Form(None), _auth: bool = Depends(require_worker_auth)):
    """Analyze video for scene changes using PySceneDetect.

    Accepts EITHER:
      - multipart 'file' upload (dev/local)  [preserved behavior], OR
      - remote 'url' (production media) resolved to a temp local file via the
        shared media resolver (fail-closed SSRF defaults).
    """
    try:
        if url:
            # ---- RESOLVER-BACKED URL PATH ----
            test_host = os.getenv("AI_WORKER_TEST_HOST_VALIDATOR")
            validator = exact_host_validator(test_host) if test_host else None
            allowed = (
                {test_host}
                if test_host
                else set(os.getenv("AI_WORKER_ALLOWED_MEDIA_HOSTS", "").split(",")) - {""}
            )
            resolved_path = resolve_media(
                url,
                allowed_hosts=allowed,
                allowed_schemes={"http", "https"} if test_host else {"https"},
                host_validator=validator,
            )
            try:
                return _detect_scenes(resolved_path)
            finally:
                # Deterministic cleanup of resolver-created temp only.
                cleanup_temp(resolved_path)

        elif file:
            # ---- EXISTING MULTIPART PATH (unchanged behavior) ----
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            try:
                return _detect_scenes(tmp_file_path)
            finally:
                os.unlink(tmp_file_path)

        else:
            raise HTTPException(status_code=400, detail="Provide 'file' or 'url'")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scene analysis failed: {str(e)}")

@app.post("/generate/captions", response_model=CaptionsResponse)
async def generate_captions(request: CaptionRequest, _auth: bool = Depends(require_worker_auth)):
    """Generate hype captions using LLM"""
    try:
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # Style-specific prompts
        style_prompts = {
            "rgb": "Create energetic, vibrant, tech-savvy captions with gaming/digital vibes",
            "lux": "Create elegant, sophisticated, premium captions with luxury appeal"
        }
        
        prompt = f"""
        Generate 6-10 high-energy caption lines for a {request.duration}-second video.
        Style: {request.style} - {style_prompts.get(request.style, "energetic and engaging")}
        Context: {request.context}
        
        Requirements:
        - Each caption ≤25 characters
        - High-energy, hype language
        - Perfect for short-form video content
        - No hashtags or @mentions
        - Style-appropriate language
        
        Return only the captions, one per line.
        """
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are an expert at creating viral video captions."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 300,
                "temperature": 0.8
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="LLM request failed")
        
        result = response.json()
        captions_text = result["choices"][0]["message"]["content"]
        
        # Parse captions
        captions = [
            line.strip() 
            for line in captions_text.split('\n') 
            if line.strip() and len(line.strip()) <= 25
        ]
        
        # Ensure we have 6-10 captions
        if len(captions) < 6:
            captions.extend([captions[0]] * (6 - len(captions)))
        captions = captions[:10]
        
        return CaptionsResponse(
            captions=captions,
            style=request.style
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Caption generation failed: {str(e)}")


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    _auth: bool = Depends(require_worker_auth),
    x_boom_paid_transcription: Optional[str] = Header(default=None),
):
    """Timed captions from source audio via OpenAI Whisper.

    Global ALLOW_PAID_CALLS stays fail-closed. The entitled Edge Function may
    send X-Boom-Paid-Transcription: entitled after account_entitlements check.
    One Whisper call per approved request. No retry.
    """
    import time as _time
    t0 = _time.monotonic()
    globally_allowed = os.getenv("ALLOW_PAID_CALLS", "FALSE").strip().upper() == "TRUE"
    request_entitled = (x_boom_paid_transcription or "").strip().lower() == "entitled"
    if not globally_allowed and not request_entitled:
        raise HTTPException(status_code=403, detail="Paid API calls are disabled")
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    tmp_path = None
    audio_path = None
    whisper_called = False
    media_duration = 0.0
    try:
        suffix = os.path.splitext(file.filename or "upload")[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        audio_path = tmp_path + ".wav"
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-v", "error",
            "-i", tmp_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            audio_path
        ]
        proc = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=60)
        no_stream = "does not contain any stream" in (proc.stderr or "").lower() or "stream map" in (proc.stderr or "").lower()
        if proc.returncode != 0 or not os.path.exists(audio_path) or os.path.getsize(audio_path) < 64 or no_stream:
            raise HTTPException(status_code=422, detail="Source has no usable audio")

        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio_path],
            capture_output=True, text=True, timeout=30,
        )
        try:
            media_duration = float((probe.stdout or "0").strip() or 0)
        except ValueError:
            media_duration = 0.0

        vol = subprocess.run(
            ["ffmpeg", "-i", audio_path, "-af", "volumedetect", "-f", "null", "-"],
            capture_output=True, text=True, timeout=60,
        )
        vol_err = (vol.stderr or "") + (vol.stdout or "")
        silent = "mean_volume: -inf" in vol_err
        if not silent:
            import re as _re
            m = _re.search(r"mean_volume:\s*(-?[0-9.]+)\s*dB", vol_err)
            if m and float(m.group(1)) <= -50.0:
                silent = True
        if silent:
            print(json.dumps({
                "event": "transcribe",
                "provider": "openai",
                "model": "whisper-1",
                "media_duration_s": media_duration,
                "elapsed_ms": int((_time.monotonic() - t0) * 1000),
                "whisper_called": False,
                "retry": False,
                "reason": "silent_source",
            }), flush=True)
            return {"captions": [], "duration": media_duration}

        with open(audio_path, "rb") as af:
            whisper_called = True
            whisper_resp = requests.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                files={"file": (os.path.basename(audio_path), af, "audio/wav")},
                data={"model": "whisper-1", "response_format": "verbose_json", "timestamp_granularities": "segment"},
                timeout=120,
            )
        if whisper_resp.status_code != 200:
            print(json.dumps({
                "event": "transcribe",
                "provider": "openai",
                "model": "whisper-1",
                "media_duration_s": media_duration,
                "elapsed_ms": int((_time.monotonic() - t0) * 1000),
                "whisper_called": True,
                "retry": False,
                "worker_status": whisper_resp.status_code,
            }), flush=True)
            raise HTTPException(status_code=502, detail=f"Whisper API error: HTTP {whisper_resp.status_code}")
        wdata = whisper_resp.json()
        segments = []
        for seg in wdata.get("segments", []):
            text = (seg.get("text") or "").strip()
            if not text:
                continue
            start = round(float(seg.get("start", 0)), 2)
            end = round(float(seg.get("end", 0)), 2)
            if end > start:
                segments.append({"text": text, "start": start, "end": end})
        print(json.dumps({
            "event": "transcribe",
            "provider": "openai",
            "model": "whisper-1",
            "media_duration_s": media_duration or wdata.get("duration", 0),
            "elapsed_ms": int((_time.monotonic() - t0) * 1000),
            "whisper_called": True,
            "retry": False,
            "segment_count": len(segments),
        }), flush=True)
        return {"captions": segments, "duration": wdata.get("duration", media_duration)}
    except HTTPException:
        raise
    except Exception as e:
        print(json.dumps({
            "event": "transcribe",
            "provider": "openai",
            "model": "whisper-1",
            "media_duration_s": media_duration,
            "elapsed_ms": int((_time.monotonic() - t0) * 1000),
            "whisper_called": whisper_called,
            "retry": False,
            "error_class": type(e).__name__,
        }), flush=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        for p in [tmp_path, audio_path]:
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


@app.post("/timeline/compile", response_model=TimelineResponse)
async def compile_timeline(request: TimelineRequest, _auth: bool = Depends(require_worker_auth)):
    """Compile timeline JSON for video rendering"""
    try:
        # Sort items by start time and track
        sorted_items = sorted(request.items, key=lambda x: (x.track, x.start_time))
        
        # Build timeline structure
        timeline = {
            "version": "1.0",
            "metadata": {
                "duration": request.duration,
                "fps": request.fps,
                "resolution": request.resolution,
                "created_at": datetime.utcnow().isoformat(),
                "total_tracks": max([item.track for item in request.items]) + 1 if request.items else 0
            },
            "tracks": {}
        }
        
        # Group items by track
        for item in sorted_items:
            track_id = f"track_{item.track}"
            if track_id not in timeline["tracks"]:
                timeline["tracks"][track_id] = {
                    "id": track_id,
                    "type": "mixed",  # can contain video, audio, image, text
                    "items": []
                }
            
            # Convert timeline item to render format
            render_item = {
                "id": item.id,
                "type": item.type,
                "start": item.start_time,
                "end": item.end_time,
                "duration": item.end_time - item.start_time,
                "content": item.content,
                "effects": item.effects,
                "z_index": item.track
            }
            
            timeline["tracks"][track_id]["items"].append(render_item)
        
        # Calculate render configuration
        render_config = {
            "output_format": "mp4",
            "codec": "h264",
            "bitrate": "5M",
            "audio_codec": "aac",
            "audio_bitrate": "192k",
            "preset": "medium",
            "crf": 23
        }
        
        # Estimate render time (rough calculation)
        complexity_score = len(request.items) + sum(len(item.effects) for item in request.items)
        estimated_render_time = request.duration * (1 + complexity_score * 0.1)
        
        return TimelineResponse(
            timeline=timeline,
            render_config=render_config,
            estimated_render_time=estimated_render_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timeline compilation failed: {str(e)}")

@app.get("/health")
async def health_check(_auth: bool = Depends(require_worker_auth)):
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "ai_worker_url": AI_WORKER_URL
    }

# ============ RENDER ENDPOINT ============
# Turns a compiled timeline into a real MP4 via ffmpeg.
# This is the feature that makes Boom AI Edit a video editor.

class RenderRequest(BaseModel):
    timeline: Dict[str, Any]
    output_path: str | None = None  # optional; defaults to a temp file
    visual_storyboard: Dict[str, Any] | None = None  # SegmentStoryboard dict for Phase 1 visual quality gate

class RenderResponse(BaseModel):
    success: bool
    output: str | None = None
    duration: float | None = None
    resolution: str | None = None
    segments_rendered: int | None = None
    error: str | None = None

@app.post("/render", response_model=RenderResponse)
async def render_video(request: RenderRequest, _auth: bool = Depends(require_worker_auth)):
    """Render a compiled timeline to MP4 using ffmpeg."""
    from renderer import render_timeline
    from visual_quality.segment_storyboard import SegmentStoryboard
    try:
        workdir = tempfile.mkdtemp(prefix="boom_render_")
        out_path = request.output_path or os.path.join(workdir, "output.mp4")
        storyboard = None
        if request.visual_storyboard is not None:
            storyboard = SegmentStoryboard()
            for seg in request.visual_storyboard.get("segments", []):
                storyboard.add_segment(
                    start=seg["start"],
                    end=seg["end"],
                    narration=seg.get("narration", ""),
                    required_visual=seg.get("required_visual", ""),
                    asset_path=seg.get("asset_path"),
                )
            for seg in storyboard.segments:
                seg.relevance_verdict = None  # let the gate evaluate fresh
        result = render_timeline(request.timeline, workdir, out_path, visual_storyboard=storyboard)
        return RenderResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render failed: {str(e)}")

# ---------------------------------------------------------------------------
# Gate #69: durable async render via Cloud Tasks (OIDC), GCP-side only.
# - /enqueue: bearer-protected; creates a Cloud Task (using the worker's own
#   GCP-managed service account via ADC — NO key exported to Supabase).
# - /task-render: accepts ONLY Cloud Tasks OIDC identity; renders; records result.
# ---------------------------------------------------------------------------
class EnqueueRequest(BaseModel):
    job_id: str
    timeline: Dict[str, Any]
    upload_url: Optional[str] = None  # Gate #73: signed Supabase upload URL (no SA key)
    visual_storyboard: Dict[str, Any] | None = None  # Phase 1 visual quality gate

def _oidc_task_identity_ok(creds) -> str:
    """Validate a Cloud Tasks OIDC bearer token. Returns the caller email or raises."""
    req = GoogleRequest()
    # Cloud Tasks OIDC tokens are signed by Google; audience = worker URL.
    audience = os.getenv("CLOUD_RUN_SERVICE_URL", "")
    try:
        payload = oidc_id_token.verify_token(
            creds.credentials,
            request=req,
            audience=audience or None,
            certs_url="https://www.googleapis.com/oauth2/v1/certs",
        )
        return payload.get("email", "")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid OIDC token: {str(e)}")

# OIDC dependency for /task-render: requires Cloud Tasks service-account identity.
def require_cloudtasks_oidc(
    creds: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
):
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Missing OIDC token")
    email = _oidc_task_identity_ok(creds)
    # Accept only the project's Cloud Tasks / runtime service account.
    if "gserviceaccount.com" not in email:
        raise HTTPException(status_code=403, detail="Untrusted OIDC issuer")
    return email

@app.post("/enqueue")
async def enqueue_job(req: EnqueueRequest, _auth: bool = Depends(require_worker_auth)):
    """Create a durable Cloud Task that will call /task-render (OIDC)."""
    parent = os.getenv("CLOUD_TASKS_QUEUE",
        "projects/boom-ai-506515/locations/us-central1/queues/boom-render-queue")
    url = os.getenv("CLOUD_RUN_SERVICE_URL", "")
    sa_email = os.getenv("CLOUD_TASKS_OIDC_SA",
        "915463858560-compute@developer.gserviceaccount.com")

    client = tasks_v2.CloudTasksClient()
    oidc = tasks_v2.OidcToken(service_account_email=sa_email, audience=url)
    task = tasks_v2.Task(
        http_request={
            "http_method": tasks_v2.HttpMethod.POST,
            "url": f"{url}/task-render",
            "headers": {"Content-Type": "application/json"},
            "oidc_token": oidc,
            "body": json.dumps({"job_id": req.job_id, "timeline": req.timeline,
                                "upload_url": req.upload_url}).encode(),
        }
    )
    created = client.create_task(parent=parent, task=task)
    return {"task_name": created.name, "job_id": req.job_id, "queued": True}

@app.post("/task-render")
async def task_render(req: EnqueueRequest, _oidc: str = Depends(require_cloudtasks_oidc)):
    """Invoked ONLY by Cloud Tasks (OIDC). Renders; uploads via signed URL; cleans /tmp.
    Gate #77: fail truthfully — never report success unless EVERY condition holds."""
    from renderer import render_timeline
    from visual_quality.segment_storyboard import SegmentStoryboard
    from media_ingest import localize_timeline, cleanup_localized
    workdir = tempfile.mkdtemp(prefix="boom_render_")
    out_path = os.path.join(workdir, f"{req.job_id}_output.mp4")
    temps: list[str] = []
    try:
        storyboard = None
        if req.visual_storyboard is not None:
            storyboard = SegmentStoryboard()
            for seg in req.visual_storyboard.get("segments", []):
                storyboard.add_segment(
                    start=seg["start"],
                    end=seg["end"],
                    narration=seg.get("narration", ""),
                    required_visual=seg.get("required_visual", ""),
                    asset_path=seg.get("asset_path"),
                )
            for seg in storyboard.segments:
                seg.relevance_verdict = None  # let the gate evaluate fresh
        localized, temps, probes = localize_timeline(req.timeline)
        if not probes:
            raise HTTPException(status_code=500,
                detail="NO_PRODUCTION_MEDIA: timeline has no localizable video/image/audio src")
        result = render_timeline(localized, workdir, out_path, visual_storyboard=storyboard)
        # (1) render process completed successfully
        if not result.get("success"):
            raise HTTPException(status_code=500,
                detail="RENDER_FAILED: render_timeline reported no success (no output produced)")
        # (2) expected local rendered MP4 exists
        if not os.path.exists(out_path):
            raise HTTPException(status_code=500,
                detail="LOCAL_RENDER_MISSING: expected output MP4 absent after render")
        # (3) local file is non-empty
        if os.path.getsize(out_path) == 0:
            raise HTTPException(status_code=500,
                detail="LOCAL_RENDER_EMPTY: rendered MP4 is zero bytes")
        # (4) signed upload URL present/valid enough to attempt
        if not req.upload_url:
            raise HTTPException(status_code=500,
                detail="UPLOAD_URL_MISSING: no signed upload URL provided")
        # (5)+(6) upload attempted and must return 2xx (Gate #73: no SA key on worker)
        with open(out_path, "rb") as f:
            r = requests.put(req.upload_url, data=f.read(),
                             headers={"content-type": "video/mp4", "x-upsert": "true"}, timeout=120)
        if r.status_code not in (200, 201):
            # Sanitized: status code only — never log URL/token/body/credentials
            raise HTTPException(status_code=502,
                detail=f"UPLOAD_FAILED: signed PUT returned HTTP {r.status_code}")
        result["uploaded_to_storage"] = True
        result["upload_http_status"] = r.status_code
        return {"job_id": req.job_id, "oidc_caller": _oidc, **result}
    finally:
        # Cleanup ephemeral render artifact + localized source temps
        try:
            cleanup_localized(temps)
        except Exception:
            pass
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
            os.rmdir(workdir)
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    # Gate #61: honor Cloud Run's assigned PORT (falls back to 8000 locally)
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)