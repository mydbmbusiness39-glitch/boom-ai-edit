// Node test for the beat detector algorithm (pure math, no browser APIs)
import { readFileSync } from "fs";

// --- Minimal WAV parser (PCM 16-bit mono) ---
function parseWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("not RIFF");
  const dataOffset = buf.indexOf(Buffer.from("data"));
  const sampleRate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  const numChannels = buf.readUInt16LE(22);
  const dataStart = dataOffset + 8;
  const samples = new Float32Array((buf.length - dataStart) / (bits / 8));
  for (let i = 0; i < samples.length; i++) {
    const byteOffset = dataStart + i * (bits / 8);
    if (bits === 16) {
      samples[i] = buf.readInt16LE(byteOffset) / 32768;
    } else if (bits === 32) {
      samples[i] = buf.readFloatLE(byteOffset);
    }
  }
  return { samples, sampleRate, numChannels };
}

// --- Same algorithm as src/lib/beatDetector.ts ---
function computeEnergyEnvelope(samples, sampleRate, hopMs = 10) {
  const hop = Math.floor((sampleRate * hopMs) / 1000);
  const frames = [];
  for (let i = 0; i < samples.length; i += hop) {
    let sum = 0;
    const end = Math.min(i + hop, samples.length);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    frames.push({ time: i / sampleRate, energy: sum / (end - i) });
  }
  return frames;
}

function detectOnsets(frames) {
  const onsets = [];
  const winSize = Math.max(4, Math.floor(200 / 10));
  const threshold = 1.35;
  for (let i = winSize; i < frames.length - 1; i++) {
    let localAvg = 0;
    for (let j = i - winSize; j < i; j++) localAvg += frames[j].energy;
    localAvg /= winSize;
    const prev = frames[i - 1].energy;
    const cur = frames[i].energy;
    if (cur > prev && cur > localAvg * threshold && cur > 1e-6) {
      onsets.push(frames[i].time);
    }
  }
  return onsets;
}

function estimateBPM(onsets, duration) {
  if (onsets.length < 4) return { bpm: 0, confidence: 0 };
  const intervals = [];
  for (let i = 1; i < onsets.length; i++) {
    const dt = onsets[i] - onsets[i - 1];
    if (dt > 0.1 && dt < 2.0) intervals.push(dt);
  }
  if (intervals.length < 3) return { bpm: 0, confidence: 0 };
  const binSize = 0.005;
  const hist = new Map();
  for (const iv of intervals) {
    const bin = Math.round(iv / binSize);
    hist.set(bin, (hist.get(bin) || 0) + 1);
  }
  let bestBin = 0, bestCount = 0;
  for (const [bin, count] of hist) {
    if (count > bestCount) { bestCount = count; bestBin = bin; }
  }
  const bestInterval = bestBin * binSize;
  let bpm = 60 / bestInterval;
  while (bpm < 60) bpm *= 2;
  while (bpm > 200) bpm /= 2;
  let agree = 0;
  for (const iv of intervals) {
    if (Math.abs(iv - bestInterval) / bestInterval < 0.15) agree++;
  }
  return { bpm: Math.round(bpm), confidence: Math.round((agree / intervals.length) * 100) / 100 };
}

function alignBeats(onsets, bpm, duration) {
  if (bpm <= 0) return onsets;
  const beatInterval = 60 / bpm;
  const beats = [];
  for (const onset of onsets) {
    const gridIdx = Math.round(onset / beatInterval);
    const gridTime = gridIdx * beatInterval;
    if (Math.abs(gridTime - onset) < beatInterval * 0.35) {
      if (beats.length === 0 || Math.abs(gridTime - beats[beats.length - 1]) > beatInterval * 0.4) {
        beats.push(parseFloat(gridTime.toFixed(3)));
      }
    }
  }
  if (beats.length < Math.max(2, Math.floor(duration / beatInterval) / 2)) {
    beats.length = 0;
    for (let t = 0; t < duration; t += beatInterval) beats.push(parseFloat(t.toFixed(3)));
  }
  return beats;
}

// --- Run test ---
const buf = readFileSync("/tmp/clicktrack_120bpm.wav");
const { samples, sampleRate } = parseWav(buf);
console.log("sampleRate:", sampleRate, "samples:", samples.length, "duration:", (samples.length / sampleRate).toFixed(2) + "s");

const frames = computeEnergyEnvelope(samples, sampleRate);
const onsets = detectOnsets(frames);
console.log("onsets detected:", onsets.length, "first 6:", onsets.slice(0, 6).map(t => t.toFixed(3)).join(", "));

const { bpm, confidence } = estimateBPM(onsets, samples.length / sampleRate);
console.log("BPM:", bpm, "confidence:", confidence);

const beats = alignBeats(onsets, bpm, samples.length / sampleRate);
console.log("aligned beats:", beats.length, "first 8:", beats.slice(0, 8).join(", "));

// Validate: 120 BPM = beat every 0.5s. First full click lands at 0.5s.
let pass = Math.abs(bpm - 120) <= 2;
const expected = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
for (let i = 0; i < Math.min(8, beats.length); i++) {
  if (Math.abs(beats[i] - expected[i]) > 0.05) pass = false;
}
// Also require a sane beat count for 12s @ 120bpm (~23-24 beats)
if (beats.length < 20 || beats.length > 26) pass = false;
console.log(pass ? "✅ PASS: beat detection correct (120 BPM, 0.5s grid, " + beats.length + " beats)" : "❌ FAIL: beat detection wrong");
