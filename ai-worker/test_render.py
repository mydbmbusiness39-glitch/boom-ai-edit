#!/usr/bin/env python3
"""Test the renderer end-to-end: build a timeline with a real clip + text overlay, render MP4."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ai-worker"))
from renderer import render_timeline, _ffmpeg_path_exists

# Find a test video
test_video = "/root/bcwa-twin/clip2.mp4"
if not os.path.exists(test_video):
    for cand in ["/root/bcwa-twin/bcwa_twin_master.mp4", "/tmp/newvid/delivery_backdrop.jpg"]:
        if os.path.exists(cand):
            test_video = cand
            break

print(f"Test asset: {test_video}")
print(f"ffmpeg available: {_ffmpeg_path_exists()}")

# Build a timeline: one video clip + one text overlay
is_video = test_video.endswith(".mp4")
timeline = {
    "metadata": {"duration": 8.0, "fps": 30, "resolution": {"width": 720, "height": 1280}},
    "tracks": {
        "track_0": {
            "items": [
                {
                    "id": "clip1",
                    "type": "video" if is_video else "image",
                    "start": 0,
                    "end": 8,
                    "duration": 8,
                    "content": {"src": test_video, "duration": 8},
                    "effects": [],
                    "z_index": 0,
                }
            ]
        },
        "track_1": {
            "items": [
                {
                    "id": "text1",
                    "type": "text",
                    "start": 0,
                    "end": 8,
                    "duration": 8,
                    "content": {"text": "BOOM AI EDIT WORKS", "style": {"fontSize": 40, "color": "white"}},
                    "effects": [],
                    "z_index": 1,
                }
            ]
        },
    },
}

out = "/tmp/boom_test_render.mp4"
result = render_timeline(timeline, "/tmp/boom_work", out)
print(json.dumps(result, indent=2))

if result.get("success") and os.path.exists(out):
    print(f"\n✅ RENDERED: {out} ({os.path.getsize(out)/1e6:.1f} MB)")
