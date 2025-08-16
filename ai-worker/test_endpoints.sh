#!/bin/bash

# Test script for AI Worker endpoints
BASE_URL="http://localhost:8000"

echo "Testing AI Worker endpoints..."

# Test health check
echo "1. Testing health check..."
curl -X GET "$BASE_URL/health" | jq .

echo -e "\n2. Testing root endpoint..."
curl -X GET "$BASE_URL/" | jq .

echo -e "\n3. Testing caption generation..."
curl -X POST "$BASE_URL/generate/captions" \
  -H "Content-Type: application/json" \
  -d '{
    "style": "rgb",
    "duration": 15,
    "context": "Epic gaming montage with explosive action"
  }' | jq .

echo -e "\n4. Testing timeline compilation..."
curl -X POST "$BASE_URL/timeline/compile" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": "video1",
        "type": "video",
        "start_time": 0,
        "end_time": 10,
        "track": 0,
        "content": {"url": "https://example.com/video.mp4"},
        "effects": [{"type": "fade_in", "duration": 1}]
      },
      {
        "id": "audio1", 
        "type": "audio",
        "start_time": 0,
        "end_time": 15,
        "track": 1,
        "content": {"url": "https://example.com/music.mp3"},
        "effects": []
      }
    ],
    "duration": 15,
    "fps": 30,
    "resolution": {"width": 1920, "height": 1080}
  }' | jq .

echo -e "\nNote: Audio/video analysis endpoints require file uploads"
echo "Test with: curl -X POST '$BASE_URL/analyze/beats' -F 'file=@audio.wav'"
echo "Test with: curl -X POST '$BASE_URL/analyze/scenes' -F 'file=@video.mp4'"

echo -e "\nAll endpoint tests completed!"