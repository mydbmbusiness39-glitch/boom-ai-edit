// Beat detection engine — pure Web Audio API, no external libs.
// Analyzes an audio file client-side: returns BPM + beat timestamps.
// Works entirely in the browser (privacy: audio never leaves the device).

export interface BeatAnalysis {
  bpm: number;
  beats: number[];        // beat times in seconds
  duration: number;       // audio duration in seconds
  confidence: number;     // 0..1
  sampleRate: number;
}

interface OnsetFrame {
  time: number;
  energy: number;
}

/**
 * Decode an audio file to raw PCM samples via Web Audio API.
 */
async function decodeToPCM(file: File): Promise<{ samples: Float32Array; sampleRate: number; duration: number }> {
  const arrayBuf = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    // Mix down to mono for analysis
    const samples = audioBuf.getChannelData(0);
    return { samples, sampleRate: audioBuf.sampleRate, duration: audioBuf.duration };
  } finally {
    ctx.close();
  }
}

/**
 * Compute short-time energy envelope with a hop of ~10ms.
 */
function computeEnergyEnvelope(samples: Float32Array, sampleRate: number, hopMs = 10): OnsetFrame[] {
  const hop = Math.floor(sampleRate * hopMs / 1000);
  const frames: OnsetFrame[] = [];
  for (let i = 0; i < samples.length; i += hop) {
    let sum = 0;
    const end = Math.min(i + hop, samples.length);
    for (let j = i; j < end; j++) {
      sum += samples[j] * samples[j];
    }
    frames.push({
      time: i / sampleRate,
      energy: sum / (end - i),
    });
  }
  return frames;
}

/**
 * Onset detection: peaks in energy change (spectral-flux-like on time domain).
 * A beat = a sharp rise in energy vs the local average.
 */
function detectOnsets(frames: OnsetFrame[], sampleRate: number): number[] {
  const onsets: number[] = [];
  const winSize = Math.max(4, Math.floor(200 / 10)); // ~200ms window in frames (10ms hops)
  const threshold = 1.35;

  for (let i = winSize; i < frames.length - 1; i++) {
    let localAvg = 0;
    for (let j = i - winSize; j < i; j++) {
      localAvg += frames[j].energy;
    }
    localAvg /= winSize;

    const prev = frames[i - 1].energy;
    const cur = frames[i].energy;

    // Onset = energy jumps ABOVE the local average (start of a spike).
    // (Square-wave clicks rise between frames, so we test cur > prev,
    //  not next > cur — that missed every click.)
    if (cur > prev && cur > localAvg * threshold && cur > 1e-6) {
      onsets.push(frames[i].time);
    }
  }
  return onsets;
}

/**
 * Estimate BPM from onset intervals via histogram of inter-onset intervals.
 */
function estimateBPM(onsets: number[], duration: number): { bpm: number; confidence: number } {
  if (onsets.length < 4) return { bpm: 0, confidence: 0 };

  // Inter-onset intervals
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const dt = onsets[i] - onsets[i - 1];
    if (dt > 0.1 && dt < 2.0) intervals.push(dt);
  }
  if (intervals.length < 3) return { bpm: 0, confidence: 0 };

  // Histogram with fine bins (0.005s)
  const binSize = 0.005;
  const hist = new Map<number, number>();
  for (const iv of intervals) {
    const bin = Math.round(iv / binSize);
    hist.set(bin, (hist.get(bin) || 0) + 1);
  }

  // Find most common interval
  let bestBin = 0, bestCount = 0;
  for (const [bin, count] of hist) {
    if (count > bestCount) { bestCount = count; bestBin = bin; }
  }
  const bestInterval = bestBin * binSize;
  let bpm = 60 / bestInterval;

  // Normalize to 60-200 range (fold octaves)
  while (bpm < 60) bpm *= 2;
  while (bpm > 200) bpm /= 2;

  // Confidence: how much of the intervals agree with the best bin (within 15%)
  let agree = 0;
  for (const iv of intervals) {
    if (Math.abs(iv - bestInterval) / bestInterval < 0.15) agree++;
  }
  const confidence = Math.min(1, agree / intervals.length);

  return { bpm: Math.round(bpm), confidence: Math.round(confidence * 100) / 100 };
}

/**
 * Align detected onsets to the estimated beat grid (snap to nearest beat).
 */
function alignBeats(onsets: number[], bpm: number, duration: number): number[] {
  if (bpm <= 0) return onsets;
  const beatInterval = 60 / bpm;
  const beats: number[] = [];
  // Snap each onset to the nearest grid point
  for (const onset of onsets) {
    const gridIdx = Math.round(onset / beatInterval);
    const gridTime = gridIdx * beatInterval;
    if (Math.abs(gridTime - onset) < beatInterval * 0.35) {
      if (beats.length === 0 || Math.abs(gridTime - beats[beats.length - 1]) > beatInterval * 0.4) {
        beats.push(parseFloat(gridTime.toFixed(3)));
      }
    }
  }
  // If too few, fall back to a straight grid
  if (beats.length < Math.max(2, Math.floor(duration / beatInterval) / 2)) {
    beats.length = 0;
    for (let t = 0; t < duration; t += beatInterval) {
      beats.push(parseFloat(t.toFixed(3)));
    }
  }
  return beats;
}

/**
 * Full beat analysis pipeline.
 */
export async function analyzeBeats(file: File): Promise<BeatAnalysis> {
  const { samples, sampleRate, duration } = await decodeToPCM(file);
  const frames = computeEnergyEnvelope(samples, sampleRate);
  const onsets = detectOnsets(frames, sampleRate);
  const { bpm, confidence } = estimateBPM(onsets, duration);
  const beats = alignBeats(onsets, bpm, duration);

  return {
    bpm,
    beats,
    duration,
    confidence,
    sampleRate,
  };
}

/**
 * Build a beat-synced cut list: segments of the video aligned to beats.
 * Returns an array of [start, end] pairs in seconds.
 */
export function buildBeatSegments(videoDuration: number, beats: number[], bpm: number, beatsPerCut = 1): Array<[number, number]> {
  if (beats.length < 2 || bpm <= 0) {
    return [[0, videoDuration]];
  }
  const segments: Array<[number, number]> = [];
  const cutEvery = beatsPerCut;
  for (let i = 0; i + cutEvery < beats.length; i += cutEvery) {
    const start = beats[i];
    const end = beats[i + cutEvery];
    if (end <= start || start >= videoDuration) continue;
    segments.push([parseFloat(start.toFixed(3)), parseFloat(Math.min(end, videoDuration).toFixed(3))]);
    if (end >= videoDuration) break;
  }
  if (segments.length === 0) return [[0, videoDuration]];
  return segments;
}
