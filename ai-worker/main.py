from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import librosa
import numpy as np
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector
import tempfile
import os
import json
from typing import List, Dict, Any
import requests
from datetime import datetime

app = FastAPI(title="AI Video Worker", version="1.0.0")

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
        "version": "1.0.0",
        "status": "ready",
        "endpoints": [
            "/analyze/beats",
            "/analyze/scenes", 
            "/generate/captions",
            "/timeline/compile"
        ]
    }

@app.post("/analyze/beats", response_model=BeatsResponse)
async def analyze_beats(file: UploadFile = File(...)):
    """Analyze audio file for BPM and beat positions using librosa"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        try:
            # Load audio with librosa
            y, sr = librosa.load(tmp_file_path)
            
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
            # Clean up temp file
            os.unlink(tmp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Beat analysis failed: {str(e)}")

@app.post("/analyze/scenes", response_model=ScenesResponse)
async def analyze_scenes(file: UploadFile = File(...)):
    """Analyze video file for scene changes using PySceneDetect"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        try:
            # Initialize video manager and scene manager
            video_manager = VideoManager([tmp_file_path])
            scene_manager = SceneManager()
            
            # Add content detector with threshold
            scene_manager.add_detector(ContentDetector(threshold=30.0))
            
            # Detect scenes
            video_manager.start()
            scene_manager.detect_scenes(frame_source=video_manager)
            scene_list = scene_manager.get_scene_list()
            
            # Convert to our format
            scenes = []
            for i, scene in enumerate(scene_list):
                start_time = scene[0].get_seconds()
                end_time = scene[1].get_seconds()
                
                # Calculate scene score (intensity of change)
                score = min(1.0, (end_time - start_time) / 10.0)  # Normalize by duration
                
                scenes.append(Scene(
                    start=start_time,
                    end=end_time,
                    score=score
                ))
            
            total_duration = video_manager.get_duration().get_seconds()
            
            return ScenesResponse(
                scenes=scenes,
                total_duration=total_duration
            )
            
        finally:
            # Clean up temp file
            os.unlink(tmp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scene analysis failed: {str(e)}")

@app.post("/generate/captions", response_model=CaptionsResponse)
async def generate_captions(request: CaptionRequest):
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

@app.post("/timeline/compile", response_model=TimelineResponse)
async def compile_timeline(request: TimelineRequest):
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
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "ai_worker_url": AI_WORKER_URL
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)