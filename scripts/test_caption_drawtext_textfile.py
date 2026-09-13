#!/usr/bin/env python3
"""Caption overlay must use drawtext=textfile= (FFmpeg 7-safe). No live jobs."""
from __future__ import annotations

import ast
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path("/root/boom-ai-edit")
sys.path.insert(0, str(ROOT / "ai-worker"))

from renderer import render_timeline  # noqa: E402


def assert_true(cond, name):
    if not cond:
        print(f"FAIL {name}")
        sys.exit(1)
    print(f"PASS {name}")


src = (ROOT / "ai-worker" / "renderer.py").read_text()
tree = ast.parse(src)
assert_true("drawtext=textfile=" in src or "textfile=" in src, "SOURCE_USES_TEXTFILE")
assert_true("drawtext=text='{escaped}'" not in src, "SOURCE_NO_INLINE_TEXT")
assert_true("expansion=none" in src, "SOURCE_DISABLES_STRFTIME")
assert_true("caption_" in src and ".txt" in src, "SOURCE_WRITES_CAPTION_TXT")


def make_clip(path: Path, seconds: float = 2.0, size: str = "320x240") -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "lavfi", "-i", f"color=c=black:s={size}:r=30:d={seconds}",
            "-f", "lavfi", "-i", f"sine=frequency=1000:sample_rate=44100:duration={seconds}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-shortest", str(path),
        ],
        check=True,
    )


def probe(path: Path) -> dict:
    r = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height",
            "-of", "json", str(path),
        ],
        capture_output=True, text=True, check=True,
    )
    import json
    return json.loads(r.stdout)


def mean_volume(path: Path) -> float:
    r = subprocess.run(
        ["ffmpeg", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    for line in (r.stderr or "").splitlines():
        if "mean_volume:" in line:
            return float(line.split("mean_volume:")[1].split("dB")[0].strip())
    raise RuntimeError("volumedetect missing")


def unique_bottom(path: Path, t: float) -> int:
    from collections import Counter
    from PIL import Image
    frame = path.with_suffix(".png")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", str(frame)],
        check=True,
    )
    im = Image.open(frame).convert("RGB")
    w, h = im.size
    crop = im.crop((0, int(h * 0.7), w, h))
    return len(Counter(list(crop.getdata())))


def caption_item(text: str, start: float, end: float, i: int) -> dict:
    return {
        "id": f"c{i}",
        "type": "text",
        "start": start,
        "end": end,
        "duration": end - start,
        "content": {"text": text, "style": {"preset": "classic"}},
        "effects": [],
        "z_index": 999,
    }


def timeline_for(clip: Path, captions: list[dict], duration: float) -> dict:
    return {
        "metadata": {"duration": duration, "fps": 30, "resolution": {"width": 320, "height": 240}},
        "tracks": {
            "track_0": {
                "items": [{
                    "id": "v0", "type": "video", "start": 0, "end": duration, "duration": duration,
                    "content": {"src": str(clip)}, "effects": [], "z_index": 0,
                }]
            },
            "track_captions": {"id": "track_captions", "type": "text", "items": captions},
        },
    }


WORKDIR = Path(tempfile.mkdtemp(prefix="caption_txt_"))
clip = WORKDIR / "src.mp4"
make_clip(clip, 2.0)

CASES = [
    ("APOSTROPHE_HES", "He's", 0.2, 1.6),
    ("APOSTROPHE_WONT", "won't", 0.2, 1.6),
    ("APOSTROPHE_YALL", "what's y'all?", 0.2, 1.6),
    ("COMMA_YES", "Yes,", 0.2, 1.6),
    ("PERCENT_100", "100%", 0.2, 1.6),
    ("COLON", "wait: go", 0.2, 1.6),
    ("DQUOTE", 'He said "go"', 0.2, 1.6),
    ("MULTILINE", "line one\nline two", 0.2, 1.6),
    ("UNICODE", "yes ✓ 🔥", 0.2, 1.6),
    ("AMP_PAREN", "Smith & Co (ok)", 0.2, 1.6),
]

for name, text, start, end in CASES:
    work = WORKDIR / name
    work.mkdir()
    out = work / "out.mp4"
    tl = timeline_for(clip, [caption_item(text, start, end, 0)], 2.0)
    result = render_timeline(tl, str(work), str(out))
    assert_true(result.get("success") is True, f"{name}_SUCCESS")
    assert_true(out.is_file() and out.stat().st_size > 1000, f"{name}_MP4")
    leftover = list(work.glob("caption_*.txt"))
    assert_true(leftover == [], f"{name}_TEMP_CLEAN")
    info = probe(out)
    streams = {s.get("codec_type"): s for s in info.get("streams") or []}
    assert_true("video" in streams and "audio" in streams, f"{name}_AV")
    vol = mean_volume(out)
    assert_true(vol > -50, f"{name}_AUDIO_NOT_SILENT")
    colors = unique_bottom(out, 0.8)
    assert_true(colors >= 3, f"{name}_VISIBLE")

# 30-caption timeline (evidence-job shape)
work30 = WORKDIR / "thirty"
work30.mkdir()
out30 = work30 / "out.mp4"
caps = []
phrases = ["He's", "won't", "what's", "y'all?", "It's", "Yes,", "that's", "I'm", "100%", "wait: go"]
for i in range(30):
    s = 0.05 + i * 0.06
    e = s + 0.05
    caps.append(caption_item(phrases[i % len(phrases)], s, e, i))
result = render_timeline(timeline_for(clip, caps, 2.0), str(work30), str(out30))
assert_true(result.get("success") is True, "THIRTY_SUCCESS")
assert_true(out30.is_file() and out30.stat().st_size > 1000, "THIRTY_MP4")
assert_true(list(work30.glob("caption_*.txt")) == [], "THIRTY_TEMP_CLEAN")
info = probe(out30)
streams = {s.get("codec_type"): s for s in info.get("streams") or []}
assert_true("video" in streams, "THIRTY_VIDEO")
assert_true("audio" in streams, "THIRTY_AUDIO")
assert_true(mean_volume(out30) > -50, "THIRTY_AUDIO_NOT_SILENT")

# processor / transcribe / gate77 untouched (source markers)
proc = (ROOT / "supabase/functions/job-processor/index.ts").read_text()
assert_true("MAX_RENDER_COMPLETE_ATTEMPTS" in proc or "render-complete" in proc, "PROCESSOR_PRESENT")
main = (ROOT / "ai-worker" / "main.py").read_text()
assert_true("from transcription import transcribe_media" in main, "TRANSCRIBE_UNCHANGED_IMPORT")

shutil.rmtree(WORKDIR, ignore_errors=True)
print("TEST_RESULTS=ALL_PASS")
