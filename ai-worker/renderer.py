"""Boom AI Edit — FFmpeg render engine.
Turns a compiled timeline into a real MP4: concat clips, mix audio, burn captions, watermark.
The feature that makes it a video editor, not a dashboard.
"""
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, List

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"


def _run(cmd: List[str], timeout: int = 600) -> subprocess.CompletedProcess:
    """Run a command and surface errors."""
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(cmd)}\n{result.stderr[-2000:]}")
    return result


def _probe_duration(path: str) -> float:
    result = subprocess.run(
        [FFPROBE, "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, timeout=30,
    )
    try:
        return float(result.stdout.strip())
    except (ValueError, AttributeError):
        return 0.0


def _ffmpeg_path_exists() -> bool:
    try:
        subprocess.run([FFMPEG, "-version"], capture_output=True, timeout=10)
        return True
    except FileNotFoundError:
        return False


def render_timeline(
    timeline: Dict[str, Any],
    workdir: str,
    output_path: str,
) -> Dict[str, Any]:
    """
    Render a compiled timeline (from /timeline/compile) to an MP4.

    timeline shape (from compile_timeline):
    {
      "metadata": {"duration": float, "fps": int, "resolution": {"width","height"}},
      "tracks": {"track_0": {"items": [{"id","type","start","end","duration",
                                        "content": {...}, "effects": [...], "z_index"}]}}
    }

    Item types handled:
      - video:  content.src (path or URL) -> trimmed clip
      - audio:  content.src (path or URL) -> mixed track
      - image:  content.src + content.duration -> Ken Burns-free static image
      - text:   content.text + content.style -> burned caption (drawtext)
    """
    if not _ffmpeg_path_exists():
        return {"success": False, "error": "ffmpeg not available on this host"}

    work = Path(workdir)
    work.mkdir(parents=True, exist_ok=True)

    meta = timeline.get("metadata", {})
    duration = float(meta.get("duration", 10))
    resolution = meta.get("resolution", {"width": 1080, "height": 1920})
    width = int(resolution.get("width", 1080))
    height = int(resolution.get("height", 1920))
    fps = int(meta.get("fps", 30))

    # Flatten items from all tracks, keep z-order by z_index
    items: List[Dict[str, Any]] = []
    for track in timeline.get("tracks", {}).values():
        items.extend(track.get("items", []))
    items.sort(key=lambda it: it.get("z_index", 0))

    video_parts: List[str] = []   # pre-rendered segment files
    extra_audio: List[str] = []   # ADDITIONAL audio overlays (music/VO) — not video segments
    filters: List[str] = []
    filter_idx = 0

    for item in items:
        itype = item.get("type", "")
        start = float(item.get("start", 0))
        end = float(item.get("end", duration))
        seg_dur = max(0.1, end - start)
        content = item.get("content", {})

        if itype == "video":
            src = content.get("src", "")
            if not src or not os.path.exists(src):
                continue
            seg = work / f"seg_{filter_idx}.mp4"
            _run([
                FFMPEG, "-y", "-v", "error", "-ss", str(start), "-t", str(seg_dur),
                "-i", src, "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                "-c:a", "aac", "-ar", "44100", "-ac", "2", str(seg),
            ])
            video_parts.append(str(seg))
            # NOTE: video/audio segments carry their own audio into the concat;
            # only 'audio' type items are extra overlays.

        elif itype == "image":
            src = content.get("src", "")
            img_dur = float(content.get("duration", seg_dur))
            if not src or not os.path.exists(src):
                continue
            seg = work / f"seg_{filter_idx}.mp4"
            _run([
                FFMPEG, "-y", "-v", "error", "-loop", "1", "-t", str(img_dur),
                "-i", src, "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                                  f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-c:a", "aac", "-ar", "44100", "-ac", "2", "-shortest", str(seg),
            ])
            video_parts.append(str(seg))

        elif itype == "audio":
            src = content.get("src", "")
            if not src or not os.path.exists(src):
                continue
            seg = work / f"audio_{filter_idx}.m4a"
            _run([
                FFMPEG, "-y", "-v", "error", "-ss", str(start), "-t", str(seg_dur),
                "-i", src, "-c:a", "aac", "-ar", "44100", "-ac", "2", str(seg),
            ])
            extra_audio.append(str(seg))

        elif itype == "text":
            text = content.get("text", "")
            if not text:
                continue
            style = content.get("style", {})
            font_size = int(style.get("fontSize", 48))
            font_color = style.get("color", "white")
            # Escape drawtext text
            escaped = text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
            draw = (f"drawtext=text='{escaped}':fontsize={font_size}:"
                    f"fontcolor={font_color}:x=(w-text_w)/2:y=h-{int(font_size * 1.6)}:"
                    f"borderw=3:bordercolor=black")
            filters.append(draw)

        filter_idx += 1

    if not video_parts:
        return {"success": False, "error": "No renderable video/image items in timeline"}

    # Concat all video segments
    concat_file = work / "concat.txt"
    concat_file.write_text("".join(f"file '{p}'\n" for p in video_parts))
    concat_video = work / "concat.mp4"
    _run([
        FFMPEG, "-y", "-v", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
        "-c:a", "aac", "-b:a", "192k", str(concat_video),
    ])

    # Mix additional audio overlays on top (music/VO ducked under main audio)
    if extra_audio:
        inputs: List[str] = []
        for a in extra_audio:
            inputs += ["-i", a]
        amix_inputs = "".join(f"[{i + 1}:a:0]" for i in range(len(extra_audio)))
        mix_file = work / "mix.mp4"
        _run([
            FFMPEG, "-y", "-v", "error", "-i", str(concat_video), *inputs,
            "-filter_complex",
            f"{amix_inputs}amix=inputs={len(extra_audio)}:duration=longest:dropout_transition=2[aout]",
            "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            str(mix_file),
        ])
        concat_video = mix_file

    # Apply text overlays + normalize audio + trim to duration
    final = Path(output_path)
    cmd = [FFMPEG, "-y", "-v", "error", "-i", str(concat_video)]
    vf_parts = list(filters)
    if vf_parts:
        cmd += ["-vf", ",".join(vf_parts)]
    cmd += [
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "medium", "-crf", "21",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        str(final),
    ]
    _run(cmd)

    out_duration = _probe_duration(str(final))
    return {
        "success": True,
        "output": str(final),
        "duration": out_duration,
        "resolution": f"{width}x{height}",
        "segments_rendered": len(video_parts),
    }
