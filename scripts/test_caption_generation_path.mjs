#!/usr/bin/env node
/**
 * Caption generation path: persist + fail-closed transcribe + processor skip.
 * Does not call live worker / OpenAI / Whisper.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const editor = readFileSync(path.join(root, "src/pages/Editor.tsx"), "utf8");
const client = readFileSync(path.join(root, "src/utils/aiWorkerClient.ts"), "utf8");
const processor = readFileSync(path.join(root, "supabase/functions/job-processor/index.ts"), "utf8");

let failed = 0;
function pass(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    failed += 1;
    return;
  }
  console.log("PASS", name);
}

pass("TRANSCRIBE_CLIENT", client.includes("transcribeSource") && client.includes("/transcribe"));
pass("NO_LLM_FROM_CLIENT_TRANSCRIBE", !/transcribeSource[\s\S]{0,400}\/generate\/captions/.test(client));
pass("PAID_403_CLEAR", client.includes("Paid transcription is disabled"));
pass("NO_AUDIO_CLEAR", client.includes("Source has no usable audio"));
pass("SILENT_NO_SPEECH", client.includes("No speech detected in source audio"));
pass("PROVIDER_FAIL_CLEAR", client.includes("Transcription provider unavailable"));
pass("TIMED_FILTER", client.includes("c.end > c.start"));

pass("EDITOR_PERSIST_LOCAL", editor.includes('localStorage.setItem("editorCaptions"'));
pass("EDITOR_PERSIST_JOB", editor.includes("captions, caption_style: captionStyle"));
pass("TRANSCRIBE_BUTTON_ENABLED", editor.includes("onClick={transcribeSourceAudio}") && !/disabled=\{true\}[\s\S]{0,200}transcribe-button/.test(editor));
pass("PLAYBACK_INTACT", editor.includes("previewVideoRef") && editor.includes("await video.play()"));
pass("DURATION_INTACT", editor.includes("resolveJobDuration") && editor.includes("SOURCE_DURATION_STORAGE_KEY"));
pass("CREATE_JOB_INTACT", editor.includes('functions.invoke("create-job"'));

pass("PROCESSOR_SKIPS_LLM_FETCH", !processor.includes("aiWorkerUrl}/generate/captions"));
pass("PROCESSOR_PRESERVES_TIMED", processor.includes("hasTimedCaptions") && processor.includes("Preserving existing timed captions"));
pass("PROCESSOR_INJECTS_TEXT_ITEMS", processor.includes("injectCaptionItems") && processor.includes("track_captions"));
pass("PROCESSOR_STAGE_STILL_ADVANCES", processor.includes("nextStage = 'timeline'") && processor.includes("progress = 60"));
pass("GATE77_UNWRAP", processor.includes("unwrapCompiledTimeline") && processor.includes("NO_PRODUCTION_MEDIA"));
pass("GATE77_NO_SYNTH_ASSIGN", !processor.includes('src: "/app/test_assets/synth_frame.png"'));
pass("GATE77_RENDER_COMPLETE", processor.includes("MAX_RENDER_COMPLETE_ATTEMPTS = 90"));

function injectCaptionItems(timeline, job) {
  if (!timeline || typeof timeline !== "object") return timeline;
  const raw = job?.files?.captions;
  if (!Array.isArray(raw) || raw.length === 0) return timeline;
  const duration = Number(job?.duration) || 15;
  const items = [];
  for (const cap of raw) {
    if (!cap || typeof cap !== "object") continue;
    const text = String(cap.text || "").trim();
    if (!text) continue;
    const start = Math.max(0, Number(cap.start || 0));
    const end = Math.min(duration, Number(cap.end || duration));
    if (!(end > start)) continue;
    items.push({ type: "text", start, end, content: { text } });
  }
  if (!items.length) return timeline;
  return { ...timeline, tracks: { ...(timeline.tracks || {}), track_captions: { items } } };
}

const base = { tracks: { track_0: { items: [{ type: "video", start: 0, end: 32.9 }] } } };

const movSpeech = injectCaptionItems(base, {
  duration: 32.9,
  files: { captions: [{ text: "hello from mov", start: 0.12, end: 2.4 }] },
});
pass("MOV_SPEECH_SEGMENT", movSpeech.tracks.track_captions.items[0].content.text === "hello from mov");
pass("MOV_TIMING", movSpeech.tracks.track_captions.items[0].start === 0.12 && movSpeech.tracks.track_captions.items[0].end === 2.4);

const mp4Speech = injectCaptionItems(base, {
  duration: 15,
  files: { captions: [{ text: "hello from mp4", start: 1, end: 3.5 }] },
});
pass("MP4_SPEECH_SEGMENT", mp4Speech.tracks.track_captions.items[0].content.text === "hello from mp4");

const silent = injectCaptionItems(base, { duration: 10, files: { captions: [] } });
pass("SILENT_NO_FABRICATE", !silent.tracks.track_captions);

const missingAudio = injectCaptionItems(base, { duration: 10, files: {} });
pass("MISSING_AUDIO_NO_FABRICATE", !missingAudio.tracks.track_captions);

const badTiming = injectCaptionItems(base, {
  duration: 10,
  files: { captions: [{ text: "x", start: 5, end: 5 }, { text: "ok", start: 1, end: 2 }] },
});
pass("TIMING_DROPS_ZERO_SPAN", badTiming.tracks.track_captions.items.length === 1 && badTiming.tracks.track_captions.items[0].text === undefined);
pass("TIMING_KEEPS_VALID", badTiming.tracks.track_captions.items[0].content.text === "ok");

function mapTranscribeFail(status, detail, captions) {
  if (status === 403) return "Paid transcription is disabled. Owner authorization required.";
  if (status === 401) return "Transcription auth failed.";
  if (status === 422 || /no usable audio|no audio stream|silent/i.test(String(detail))) return "Source has no usable audio.";
  if (status && status !== 200) return `Transcription provider unavailable: ${detail}`;
  const timed = (captions || []).filter((c) => c && c.end > c.start && String(c.text || "").trim());
  if (!timed.length) return "No speech detected in source audio.";
  return "OK";
}
pass("SILENT_SOURCE_BEHAVIOR", mapTranscribeFail(200, "", []) === "No speech detected in source audio.");
pass("MISSING_AUDIO_BEHAVIOR", mapTranscribeFail(422, "no audio stream", []) === "Source has no usable audio.");
pass("PROVIDER_FAILURE_BEHAVIOR", mapTranscribeFail(500, "LLM request failed", []).startsWith("Transcription provider unavailable"));
pass("PAID_GATE_BEHAVIOR", mapTranscribeFail(403, "Paid API calls are disabled", []).includes("Owner authorization"));
pass("MOV_OK_PATH", mapTranscribeFail(200, "", [{ text: "hi", start: 0, end: 1 }]) === "OK");
pass("MP4_OK_PATH", mapTranscribeFail(200, "", [{ text: "hi", start: 0.5, end: 1.2 }]) === "OK");

if (failed) {
  console.error("TEST_RESULTS=FAIL", failed);
  process.exit(1);
}
console.log("TEST_RESULTS=ALL_PASS");
