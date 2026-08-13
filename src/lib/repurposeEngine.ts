// Content Repurposer engine — client-side ffmpeg.wasm.
// One upload → crop/scale to every platform ratio, all in the browser.
// No server needed: files never leave the user's device.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface PlatformPreset {
  id: string;
  name: string;
  ratio: string;
  width: number;
  height: number;
  note: string;
  platform: string;
  color: string;
}

export const PLATFORMS: PlatformPreset[] = [
  { id: "tiktok", name: "TikTok", ratio: "9:16", width: 1080, height: 1920, note: "Vertical full-screen", platform: "TikTok", color: "#25F4EE" },
  { id: "yt-shorts", name: "YouTube Shorts", ratio: "9:16", width: 1080, height: 1920, note: "Vertical full-screen", platform: "YouTube", color: "#FF0000" },
  { id: "ig-reels", name: "IG Reels", ratio: "9:16", width: 1080, height: 1920, note: "Vertical full-screen", platform: "Instagram", color: "#E1306C" },
  { id: "ig-feed", name: "IG Feed", ratio: "1:1", width: 1080, height: 1080, note: "Square post", platform: "Instagram", color: "#833AB4" },
  { id: "ig-portrait", name: "IG Portrait", ratio: "4:5", width: 1080, height: 1350, note: "Portrait post", platform: "Instagram", color: "#FD1D1D" },
  { id: "fb-feed", name: "Facebook Feed", ratio: "1:1", width: 1080, height: 1080, note: "Square post", platform: "Facebook", color: "#1877F2" },
  { id: "yt-wide", name: "YouTube", ratio: "16:9", width: 1920, height: 1080, note: "Landscape video", platform: "YouTube", color: "#FF0000" },
];

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export interface RepurposeProgress {
  platformId: string;
  progress: number; // 0..1
  stage: string;    // "loading", "processing", "done", "error"
  message?: string;
}

type ProgressCb = (p: RepurposeProgress) => void;

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

export async function isEngineReady(): Promise<boolean> {
  try {
    const ffmpeg = await getFFmpeg();
    return !!ffmpeg;
  } catch {
    return false;
  }
}

/**
 * Repurpose a single video file into one platform's aspect ratio.
 * Returns a Blob (MP4) the caller can preview + download.
 */
export async function repurposeVideo(
  file: File,
  preset: PlatformPreset,
  onProgress?: ProgressCb,
): Promise<Blob> {
  const platformId = preset.id;

  const emit = (progress: number, stage: string, message?: string) => {
    if (onProgress) onProgress({ platformId, progress, stage, message });
  };

  emit(0, "loading", "Loading video…");

  const ffmpeg = await getFFmpeg((p) => emit(p, "processing", "Processing…"));

  const inputName = `input_${Date.now()}.mp4`;
  const outputName = `output_${platformId}_${Date.now()}.mp4`;

  try {
    // Write input file into the wasm virtual filesystem
    const data = await fetchFile(file);
    await ffmpeg.writeFile(inputName, data);

    // Smart crop: scale to cover the target ratio, then center-crop.
    // Validated locally with ffmpeg 6.1: scale=W:H:force_original_aspect_ratio=increase,crop=W:H
    const filter = `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=increase,crop=${preset.width}:${preset.height}`;

    await ffmpeg.exec([
      "-i", inputName,
      "-vf", filter,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y",
      outputName,
    ]);

    emit(0.9, "processing", "Finalizing…");

    const outData = await ffmpeg.readFile(outputName);
    const blob = new Blob([outData as BlobPart], { type: "video/mp4" });

    // Cleanup virtual files
    try { await ffmpeg.deleteFile(inputName); } catch { /* noop */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* noop */ }

    emit(1, "done");
    return blob;
  } catch (e: any) {
    emit(0, "error", e?.message || "Processing failed");
    throw e;
  }
}

/** Download a blob to the user's device. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
