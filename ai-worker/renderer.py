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

# Smart Captions Phase 1: visual style presets
CAPTION_STYLES = {
    "classic": {"fontSize": 48, "fontColor": "white", "borderWidth": 3, "borderColor": "black", "yOffset": 0},
    "bold": {"fontSize": 60, "fontColor": "yellow", "borderWidth": 5, "borderColor": "black", "yOffset": 0},
    "minimal": {"fontSize": 36, "fontColor": "white", "borderWidth": 1, "borderColor": "black", "yOffset": -40},
}



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


def _filter_escape_path(path: Path) -> str:
    """Escape an internally generated local path for an ffmpeg filter argument."""
    return str(path).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def _write_caption_textfile(work: Path, idx: int, text: str) -> Path:
    """Write caption UTF-8 into workdir. Filename is generated; never from caption text."""
    dest = work / f"caption_{idx}.txt"
    dest.write_text(text, encoding="utf-8")
    return dest


def render_timeline(
    timeline: Dict[str, Any],
    workdir: str,
    output_path: str,
    visual_storyboard=None,
) -> Dict[str, Any]:
    """
    Render a compiled timeline (from /timeline/compile) to an MP4.

    Args:
        timeline: Compiled timeline dict.
        workdir: Working directory for intermediate files.
        output_path: Final output MP4 path.
        visual_storyboard: Optional SegmentStoryboard instance.
            If provided, the visual relevance gate is enforced BEFORE rendering.
            All segments must be RELEVANT or the render is blocked.

    Returns:
        Render result dict with success/output/duration/etc.
    """
    # ---- Visual Quality Gate (Phase 1) ----
    if visual_storyboard is not None:
        from visual_quality.relevance_gate import RelevanceGate
        gate = RelevanceGate(max_reuse=1)
        for seg in visual_storyboard.segments:
            if seg.asset_path:
                gate.evaluate(seg)
        all_relevant = all(
            s.relevance_verdict == "RELEVANT" for s in visual_storyboard.segments
        )
        if not all_relevant:
            return {
                "success": False,
                "error": "PRE-RENDER BLOCKED: visual quality gate failed. "
                        f"Report:\n{gate.report(visual_storyboard)}",
                "segments_rendered": 0,
            }
    # ---- End Visual Quality Gate ----

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
    audio_items = 0  # count of real 'audio'-type items (image-branch anullsrc fill is synthetic silence)
    caption_files: List[Path] = []

    try:
        for item in items:
            itype = item.get("type", "")
            start = float(item.get("start", 0))
            end = float(item.get("end", duration))
            seg_dur = max(0.1, end - start)
            content = item.get("content", {})

            if itype == "video":
                src = content.get("src", "")
                if not src or not os.path.exists(src):
                    raise RuntimeError(f"VIDEO_SRC_UNRESOLVED: production media was not localized")
                seg = work / f"seg_{filter_idx}.mp4"
                vf = (f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                      f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1")
                # Carry source audio when present. anullsrc only if the source has no
                # audio stream (timeline did not include a separate audio item).
                if content.get("has_audio") is False:
                    _run([
                        FFMPEG, "-y", "-v", "error", "-ss", str(start), "-t", str(seg_dur),
                        "-i", src, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                        "-vf", vf,
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                        "-c:a", "aac", "-ar", "44100", "-ac", "2", "-shortest", str(seg),
                    ])
                else:
                    _run([
                        FFMPEG, "-y", "-v", "error", "-ss", str(start), "-t", str(seg_dur),
                        "-i", src, "-vf", vf,
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                        "-c:a", "aac", "-ar", "44100", "-ac", "2", str(seg),
                    ])
                video_parts.append(str(seg))
                # NOTE: video/audio segments carry their own audio into the concat;
                # only extra 'audio' type items are overlays. Do not bump audio_items
                # here — loudnorm on digital-silence source AAC (gate77_test_video)
                # emits NaN. loudnorm stays gated on real 'audio' overlay items.

            elif itype == "image":
                src = content.get("src", "")
                img_dur = float(content.get("duration", seg_dur))
                if not src or not os.path.exists(src):
                    raise RuntimeError("IMAGE_SRC_UNRESOLVED: production media was not localized")
                seg = work / f"seg_{filter_idx}.mp4"
                _run([
                    FFMPEG, "-y", "-v", "error", "-loop", "1", "-t", str(img_dur),
                    "-i", src,
                    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                    "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                           f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                    "-c:a", "aac", "-ar", "44100", "-ac", "2", "-shortest", str(seg),
                ])
                video_parts.append(str(seg))

            elif itype == "audio":
                audio_items += 1
                src = content.get("src", "")
                if not src or not os.path.exists(src):
                    raise RuntimeError("AUDIO_SRC_UNRESOLVED: production media was not localized")
                seg = work / f"audio_{filter_idx}.m4a"
                _run([
                    FFMPEG, "-y", "-v", "error", "-ss", str(start), "-t", str(seg_dur),
                    "-i", src, "-c:a", "aac", "-ar", "44100", "-ac", "2", str(seg),
                ])
                extra_audio.append(str(seg))

            elif itype == "text":
                text = content.get("text", "")
                if not text:
                    filter_idx += 1
                    continue
                style = content.get("style", {})
                preset = style.get("preset", "classic")
                preset_cfg = CAPTION_STYLES.get(preset, CAPTION_STYLES["classic"])
                font_size = int(style.get("fontSize", preset_cfg["fontSize"]))
                font_color = style.get("color", preset_cfg["fontColor"])
                border_width = int(style.get("borderWidth", preset_cfg["borderWidth"]))
                border_color = style.get("borderColor", preset_cfg["borderColor"])
                y_offset = int(style.get("yOffset", preset_cfg["yOffset"]))
                start_time = start
                end_time = end
                # Clamp times to timeline bounds
                start_time = max(0.0, min(start_time, duration))
                end_time = max(start_time, min(end_time, duration))
                cap_path = _write_caption_textfile(work, filter_idx, text)
                caption_files.append(cap_path)
                y_pos = f"h-{max(1, font_size * 1.6)}{y_offset:+d}" if y_offset else f"h-{int(font_size * 1.6)}"
                enable = f"enable='between(t,{start_time:.3f},{end_time:.3f})'"
                draw = (
                    f"drawtext=textfile={_filter_escape_path(cap_path)}:expansion=none:"
                    f"fontsize={font_size}:fontcolor={font_color}:x=(w-text_w)/2:y={y_pos}:"
                    f"borderw={border_width}:bordercolor={border_color}:{enable}"
                )
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
        # Synthetic silence only (no real 'audio' items) => skip loudnorm to avoid
        # emitting NaN/Inf on a zero-energy track that the AAC encoder rejects.
        # Real/non-silent audio keeps the existing loudnorm behavior unchanged.
        if audio_items == 0:
            cmd += ["-t", str(duration), "-c:v", "libx264", "-preset", "veryfast",
                    "-threads", "1", "-crf", "21",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]
        else:
            cmd += [
                "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                "-t", str(duration),
                "-c:v", "libx264", "-preset", "veryfast", "-threads", "1", "-crf", "21",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
            ]
        cmd += [str(final)]
        _run(cmd)

        out_duration = _probe_duration(str(final))
        return {
            "success": True,
            "output": str(final),
            "duration": out_duration,
            "resolution": f"{width}x{height}",
            "segments_rendered": len(video_parts),
        }
    finally:
        for cap in caption_files:
            try:
                cap.unlink(missing_ok=True)
            except OSError:
                pass
