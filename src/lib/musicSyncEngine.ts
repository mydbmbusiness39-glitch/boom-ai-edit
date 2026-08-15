// Auto-Music Sync engine — cut video to the beat + mux music.
// Client-side ffmpeg.wasm, same self-hosted ESM core as the repurposer.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { buildBeatSegments } from "./beatDetector";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export interface SyncProgress {
  stage: "loading" | "analyzing" | "processing" | "done" | "error";
  progress: number;
  message?: string;
}

type ProgressCb = (p: SyncProgress) => void;

async function getFFmpeg(onProgress?: (p: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => {
        if (onProgress) onProgress(progress);
      });
      const baseURL = "/ffmpeg";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return loadPromise;
}

/**
 * Cut a video at beat boundaries (keep only beat-aligned segments, in order)
 * and lay the music track under it. Returns the synced MP4 as a Blob.
 *
 * @param videoFile    the source video (any orientation)
 * @param musicFile    the music track to mix under
 * @param beats        beat timestamps (seconds) from beatDetector.analyzeBeats
 * @param bpm          detected BPM
 * @param beatsPerCut  keep a segment every N beats (1 = cut every beat)
 */
export async function syncVideoToMusic(
  videoFile: File,
  musicFile: File,
  beats: number[],
  bpm: number,
  beatsPerCut: number,
  onProgress?: ProgressCb,
  videoDuration?: number,
): Promise<Blob> {
  const emit = (progress: number, stage: SyncProgress["stage"], message?: string) => {
    if (onProgress) onProgress({ progress, stage, message });
  };

  emit(0.02, "loading", "Loading engine…");
  const ffmpeg = await getFFmpeg((p) => emit(p, "processing", "Cutting to the beat…"));

  const inputV = `input_v_${Date.now()}.mp4`;
  const inputA = `input_a_${Date.now()}.mp3`;
  const outputName = `synced_${Date.now()}.mp4`;

  try {
    emit(0.08, "analyzing", "Reading video…");
    await ffmpeg.writeFile(inputV, await fetchFile(videoFile));
    emit(0.15, "analyzing", "Reading music…");
    await ffmpeg.writeFile(inputA, await fetchFile(musicFile));

    // Use the real video duration (passed from the page after beat analysis),
    // else derive from the last detected beat, else a sane 30s fallback.
    let videoDuration = videoFile && (videoFile as any).duration ? (videoFile as any).duration : 0;
    if (!videoDuration || !isFinite(videoDuration) || videoDuration <= 0) {
      videoDuration = beats.length ? beats[beats.length - 1] + 60 / Math.max(1, bpm) : 30;
    }
    if (!videoDuration || !isFinite(videoDuration) || videoDuration <= 0) {
      videoDuration = 30;
    }

    // Build beat-aligned segments over the real video length.
    const segments = buildBeatSegments(videoDuration, beats, bpm, beatsPerCut);
    // Clamp to a sane cap (avoid absurd filter graphs on 10-min videos)
    const capped = segments.slice(0, 120);

    if (capped.length === 0 || (capped.length === 1 && capped[0][0] === 0 && capped[0][1] === Number.MAX_SAFE_INTEGER / 1000)) {
      // No usable beats — fall back to a plain music overlay
      emit(0.3, "processing", "No beats found — overlaying music…");
      await ffmpeg.exec([
        "-i", inputV,
        "-i", inputA,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        "-movflags", "+faststart",
        "-y",
        outputName,
      ]);
    } else {
      // select filter: keep frames only inside each beat segment, in order
      const expr = capped
        .map(([s, e]) => `between(t,${s},${e})`)
        .join("+");
      // scale to a safe even dimension if source is odd-sized
      const vf = `scale=trunc(iw/2)*2:trunc(ih/2)*2,select='${expr}',setpts=N/FRAME_RATE/TB`;
      emit(0.25, "processing", `Cutting ${capped.length} beat segments…`);
      await ffmpeg.exec([
        "-i", inputV,
        "-i", inputA,
        "-filter_complex",
        `[0:v]${vf}[v]`,
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        "-movflags", "+faststart",
        "-y",
        outputName,
      ]);
    }

    emit(0.9, "processing", "Finalizing…");
    const outData = await ffmpeg.readFile(outputName);
    const blob = new Blob([outData as BlobPart], { type: "video/mp4" });

    try { await ffmpeg.deleteFile(inputV); } catch { /* noop */ }
    try { await ffmpeg.deleteFile(inputA); } catch { /* noop */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* noop */ }

    emit(1, "done");
    return blob;
  } catch (e: any) {
    emit(0, "error", e?.message || "Sync failed");
    throw e;
  }
}
