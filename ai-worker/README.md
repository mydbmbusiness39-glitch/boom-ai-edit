# AI Video Worker Service

FastAPI service providing AI-powered video analysis and processing capabilities.

## Features

- **Beat Analysis** (`/analyze/beats`) - Extract BPM and beat timing from audio using librosa
- **Scene Detection** (`/analyze/scenes`) - Identify scene changes in video using PySceneDetect  
- **Caption Generation** (`/generate/captions`) - Create hype captions with LLM, style-aware
- **Timeline Compilation** (`/timeline/compile`) - Compile timeline JSON for video rendering

## Quick Start

### Using Docker (Recommended)

1. **Set environment variables:**
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

2. **Build and run:**
```bash
docker-compose up --build
```

3. **Test endpoints:**
```bash
chmod +x test_endpoints.sh
./test_endpoints.sh
```

### Manual Installation

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Install system dependencies (Ubuntu/Debian):**
```bash
sudo apt-get install ffmpeg libsm6 libxext6 libfontconfig1 libxrender1 libgomp1
```

3. **Run the service:**
```bash
export OPENAI_API_KEY="your-openai-api-key"
export AI_WORKER_URL="http://localhost:8000"
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST /analyze/beats
Analyze audio for BPM and beat positions.

**Request:** `multipart/form-data` with audio file
**Response:**
```json
{
  "bpm": 120.5,
  "beats": [0.0, 0.5, 1.0, 1.5],
  "tempo_confidence": 0.8
}
```

**Test:**
```bash
curl -X POST "http://localhost:8000/analyze/beats" \
  -F "file=@audio.wav"
```

### POST /analyze/scenes
Detect scene changes in video.

**Request:** `multipart/form-data` with video file
**Response:**
```json
{
  "scenes": [
    {"start": 0.0, "end": 2.1, "score": 0.8},
    {"start": 2.1, "end": 5.3, "score": 0.6}
  ],
  "total_duration": 15.0
}
```

**Test:**
```bash
curl -X POST "http://localhost:8000/analyze/scenes" \
  -F "file=@video.mp4"
```

### POST /generate/captions
Generate style-aware hype captions.

**Request:**
```json
{
  "style": "rgb",
  "duration": 20,
  "context": "Epic gaming montage"
}
```

**Response:**
```json
{
  "captions": [
    "GAME OVER!",
    "Epic Win!",
    "Legendary Move!",
    "Beast Mode ON!",
    "Victory Royale!",
    "Insane Skills!"
  ],
  "style": "rgb"
}
```

**Test:**
```bash
curl -X POST "http://localhost:8000/generate/captions" \
  -H "Content-Type: application/json" \
  -d '{"style": "rgb", "duration": 15, "context": "Gaming highlights"}'
```

### POST /timeline/compile
Compile timeline for video rendering.

**Request:**
```json
{
  "items": [
    {
      "id": "video1",
      "type": "video", 
      "start_time": 0,
      "end_time": 10,
      "track": 0,
      "content": {"url": "video.mp4"},
      "effects": [{"type": "fade_in", "duration": 1}]
    }
  ],
  "duration": 15,
  "fps": 30,
  "resolution": {"width": 1920, "height": 1080}
}
```

**Response:**
```json
{
  "timeline": {
    "version": "1.0",
    "metadata": {...},
    "tracks": {...}
  },
  "render_config": {
    "output_format": "mp4",
    "codec": "h264",
    "bitrate": "5M"
  },
  "estimated_render_time": 45.5
}
```

## Environment Variables

- `OPENAI_API_KEY` - Required for caption generation
- `AI_WORKER_URL` - Service URL (default: http://localhost:8000)

## Production Deployment

### Docker
```bash
docker build -t ai-video-worker .
docker run -p 8000:8000 \
  -e OPENAI_API_KEY="your-key" \
  -e AI_WORKER_URL="https://your-domain.com" \
  ai-video-worker
```

### Cloud Deployment
- **Railway:** Connect repo, add env vars, deploy
- **Render:** Web service from repo, add env vars
- **DigitalOcean Apps:** Import from repo, configure env
- **AWS/GCP/Azure:** Container service deployment

## Integration with Frontend

The service integrates with your React app through Supabase Edge Functions:

1. Add `AI_WORKER_URL` to Supabase secrets
2. Deploy the `ai-worker-proxy` edge function  
3. Use `aiWorkerClient` in your React components

```typescript
import { aiWorkerClient } from '@/utils/aiWorkerClient';

// Analyze beats
const beats = await aiWorkerClient.analyzeBeats(audioFile);

// Generate captions
const captions = await aiWorkerClient.generateCaptions({
  style: 'rgb',
  duration: 20,
  context: 'Epic montage'
});
```

## Health Check

```bash
curl http://localhost:8000/health
```

Service is ready when all test endpoints return valid JSON responses.