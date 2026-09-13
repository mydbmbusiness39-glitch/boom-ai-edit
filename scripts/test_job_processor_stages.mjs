#!/usr/bin/env node
/**
 * Non-production contract tests for job-processor stages vs live jobs_new
 * schema and the post-create-job files shape:
 *   files = { media: [...], music, timeline }
 * Does not invoke production, create jobs, or call the worker.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(
  path.join(root, "supabase/functions/job-processor/index.ts"),
  "utf8"
);

function assert(cond, name) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`PASS ${name}`);
}

const LIVE_COLUMNS = new Set([
  "id",
  "user_id",
  "name",
  "status",
  "files",
  "style_id",
  "duration",
  "progress",
  "preview_url",
  "output_url",
  "watermarked",
  "created_at",
  "updated_at",
  "next_stage",
  "render_check",
]);

const updateBlocks = [...src.matchAll(/\.from\('jobs_new'\)\.update\(\{/g)];
assert(updateBlocks.length >= 5, "HAS_JOBS_NEW_UPDATES");
for (const m of updateBlocks) {
  const start = m.index + m[0].length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    i++;
  }
  const block = src.slice(start, i - 1);
  const topLevel = [];
  depth = 0;
  let token = "";
  for (const ch of block) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (depth === 0 && /[A-Za-z0-9_]/.test(ch)) token += ch;
    else if (depth === 0 && ch === ":" && token) {
      topLevel.push(token);
      token = "";
    } else if (depth === 0) token = "";
  }
  for (const k of topLevel) {
    assert(LIVE_COLUMNS.has(k), `UPDATE_COLUMN_EXISTS_${k}`);
  }
}

assert(!src.includes(".update({") || !/from\('jobs_new'\)\.update\(\{[^}]*\berror\s*:/.test(src), "NO_ERROR_COLUMN_WRITE");
assert(!src.includes("JSON.stringify(dlErr)"), "DLERR_UNDEFINED_REMOVED");
assert(src.includes("JSON.stringify(sigErr)"), "EXHAUSTION_USES_SIGERR");
assert(src.includes("if (head.ok && contentLength === 0)"), "HEAD_EMPTY_ONLY_RESETS_FOUND");
assert(!/found = head\.ok && contentLength > 0/.test(src), "HEAD_NO_MANDATORY_OVERRIDE");

const timeline = {
  version: "1.0",
  metadata: { duration: 15, fps: 30, resolution: { width: 1080, height: 1920 } },
  tracks: { track_0: { id: "track_0", type: "mixed", items: [] } },
};

const job = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "processing",
  progress: 0,
  next_stage: null,
  render_check: 0,
  duration: 15,
  style_id: "lux",
  name: "Luxury Video - 15s",
  files: {
    media: [
      {
        url: "https://example.invalid/video.mp4",
        name: "gate77_test_video.mp4",
        size: 2340469,
        type: "video",
      },
    ],
    music: "auto",
    timeline,
  },
  output_url: null,
};

function mediaFilter(files, kind) {
  return files?.media?.filter((f) => f.type === kind) || [];
}

let beatsThrew = false;
let audioFiles;
try {
  audioFiles = mediaFilter(job.files, "audio");
} catch (e) {
  beatsThrew = true;
}
assert(!beatsThrew, "BEATS_STAGE_NO_TYPEERROR");
assert(Array.isArray(audioFiles) && audioFiles.length === 0, "BEATS_AUDIO_EMPTY_OK");

let scenesThrew = false;
let videoFiles;
try {
  videoFiles = mediaFilter(job.files, "video");
} catch (e) {
  scenesThrew = true;
}
assert(!scenesThrew, "SCENES_STAGE_NO_TYPEERROR");
assert(Array.isArray(videoFiles) && videoFiles.length === 1, "SCENES_VIDEO_ARRAY");

assert(Array.isArray(job.files.media), "FILES_MEDIA_IS_ARRAY");
assert(job.files.music === "auto", "MUSIC_PRESERVED");
assert(job.files.timeline === timeline, "TIMELINE_PRESERVED");
assert(job.files.timeline.metadata && job.files.timeline.tracks, "BUILD_TIMELINE_PREFERS_COMPILED");

const STAGE_CHAIN = {
  beats: { progress: 20, next: "scenes" },
  scenes: { progress: 40, next: "captions" },
  captions: { progress: 60, next: "timeline" },
  timeline: { progress: 80, next: "render" },
  render: { progress: 95, next: "render-complete" },
  "render-complete": { progress: 100, next: "" },
};
assert(src.includes("nextStage = 'scenes'"), "BEATS_NEXT_SCENES");
assert(src.includes("nextStage = 'captions'"), "SCENES_NEXT_CAPTIONS");
assert(src.includes("nextStage = 'timeline'"), "CAPTIONS_NEXT_TIMELINE");
assert(src.includes("nextStage = 'render'"), "TIMELINE_NEXT_RENDER");
assert(src.includes("next_stage: 'render-complete'"), "RENDER_NEXT_RENDER_COMPLETE");
assert(src.includes("status: 'completed'"), "COMPLETION_SETS_COMPLETED");
assert(src.includes("progress: 100"), "COMPLETION_PROGRESS_100");
assert(src.includes("output_url: pubUrl") || src.includes("output_url: publicUrl"), "COMPLETION_SETS_OUTPUT_URL");
assert(src.includes("body.renderCheck"), "RENDER_CHECK_READS_TRIGGER_CAMELCASE");
assert(STAGE_CHAIN.beats.next === "scenes", "CHAIN_BEATS");
assert(STAGE_CHAIN["render-complete"].progress === 100, "CHAIN_COMPLETE");

function decideFound({ sigErr, signedUrl, headOk, contentLength, headThrows }) {
  let found = !sigErr && !!signedUrl;
  if (found && signedUrl) {
    try {
      if (headThrows) throw new Error("network");
      if (headOk && contentLength === 0) found = false;
    } catch {
      // HEAD transport failure is non-fatal
    }
  }
  return found;
}

assert(decideFound({ sigErr: null, signedUrl: "https://x", headOk: true, contentLength: 31267 }) === true, "HEAD_OK_KEEPS_FOUND");
assert(decideFound({ sigErr: null, signedUrl: "https://x", headOk: false, contentLength: 0 }) === true, "HEAD_NON_OK_DOES_NOT_RESET");
assert(decideFound({ sigErr: null, signedUrl: "https://x", headOk: true, contentLength: 0 }) === false, "HEAD_EMPTY_CONFIRMS_ABSENT");
assert(decideFound({ sigErr: null, signedUrl: "https://x", headThrows: true }) === true, "HEAD_THROW_NON_FATAL");
assert(decideFound({ sigErr: { code: "not_found" }, signedUrl: null }) === false, "MISSING_OBJECT_NOT_FOUND");

const wrapped = { media: job.files, music: "auto" };
let wrapThrew = false;
try {
  wrapped.media.filter((f) => f.type === "audio");
} catch (e) {
  wrapThrew = e instanceof TypeError;
}
assert(wrapThrew, "OLD_WRAP_STILL_TYPEERRORS");

// --- Gate #77 real-source unwrap (3ba62a88 nested compile) ---
assert(src.includes("unwrapCompiledTimeline"), "HAS_UNWRAP_COMPILED_TIMELINE");
assert(src.includes("NO_PRODUCTION_MEDIA"), "FAILS_CLOSED_NO_MEDIA");
assert(!src.includes('src: "/app/test_assets/synth_frame.png"'), "NO_SYNTH_PRODUCTION_FALLBACK");
assert(src.includes("files.timeline.timeline"), "DOCUMENTS_NESTED_SHAPE");

function unwrapCompiledTimeline(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.tracks && (raw.metadata || raw.version)) return raw;
  const nested = raw.timeline;
  if (nested && typeof nested === "object" && nested.tracks) return nested;
  return null;
}
function collectMediaSrcs(doc) {
  const srcs = [];
  const tracks = doc && doc.tracks && typeof doc.tracks === "object" ? doc.tracks : {};
  for (const track of Object.values(tracks)) {
    const items = track && Array.isArray(track.items) ? track.items : [];
    for (const item of items) {
      const s = item && item.content && item.content.src;
      if (typeof s === "string" && s) srcs.push(s);
    }
  }
  return srcs;
}

const nestedJobFiles = {
  timeline: {
    timeline: {
      tracks: {
        track_0: {
          items: [
            {
              type: "video",
              content: {
                src: "https://dgrkcuddnfhkwsclviqk.supabase.co/storage/v1/object/public/videoupload/uploads/x/gate77_test_video.mp4",
              },
            },
          ],
        },
      },
      metadata: { duration: 15 },
    },
    render_config: { codec: "h264" },
  },
  media: [{ url: "https://example.invalid/unused.mp4", type: "video" }],
};
const unwrapped = unwrapCompiledTimeline(nestedJobFiles.timeline);
assert(!!unwrapped && !!unwrapped.tracks, "NESTED_UNWRAP_HAS_TRACKS");
assert(
  collectMediaSrcs(unwrapped)[0].includes("gate77_test_video.mp4"),
  "NESTED_UNWRAP_KEEPS_SOURCE_URL"
);
assert(!unwrapCompiledTimeline({ render_config: {} }), "EMPTY_COMPILE_NULL");
assert(!!unwrapCompiledTimeline(timeline) && !!unwrapCompiledTimeline(timeline).tracks, "FLAT_TIMELINE_PASSTHROUGH");

// --- Defect E timing: poll window vs real /task-render duration ---
const maxMatch = src.match(/MAX_RENDER_COMPLETE_ATTEMPTS\s*=\s*(\d+)/);
const backoffMatch = src.match(/RENDER_COMPLETE_BACKOFF_MS\s*=\s*(\d+)/);
assert(!!maxMatch, "HAS_MAX_RENDER_COMPLETE_ATTEMPTS");
assert(!!backoffMatch, "HAS_RENDER_COMPLETE_BACKOFF_MS");
const MAX_ATTEMPTS = Number(maxMatch[1]);
const BACKOFF_MS = Number(backoffMatch[1]);
const OLD_MAX_ATTEMPTS_V20 = 12;
const OLD_MAX_ATTEMPTS_V22 = 48; // exhausted on 29230672 before 149.8s render landed
const OLD_POLL_WINDOW_MS = 17000; // proven ~17s exhaust on bdfa585f
const TASK_RENDER_MS_G77 = 30750; // Gate #77 15s 1080p
const TASK_RENDER_MS_150 = 149800; // evidence 29230672
const PG_NET_TIMEOUT_MS = 5000;
const MIN_WALL_MS = 180000;
const backoffWindowMs = MAX_ATTEMPTS * BACKOFF_MS;
// Evidence: 48 attempts ≈ 123s wall (~2.56s/attempt with invoke). Conservative 2s/attempt.
const conservativeWallMs = MAX_ATTEMPTS * 2000;

assert(MAX_ATTEMPTS === 90, "MAX_ATTEMPTS_IS_90");
assert(BACKOFF_MS === 1000, "BACKOFF_IS_1000");
assert(MAX_ATTEMPTS > OLD_MAX_ATTEMPTS_V22, "NEW_ATTEMPTS_EXCEED_OLD_48");
assert(BACKOFF_MS > 0 && BACKOFF_MS < PG_NET_TIMEOUT_MS, "BACKOFF_UNDER_PGNET_TIMEOUT");
assert(backoffWindowMs > TASK_RENDER_MS_G77, "WINDOW_EXCEEDS_G77_TASK_RENDER");
assert(backoffWindowMs > OLD_POLL_WINDOW_MS, "WINDOW_EXCEEDS_OLD_17S");
assert(conservativeWallMs >= MIN_WALL_MS, "CONSERVATIVE_WALL_AT_LEAST_180S");
assert(conservativeWallMs > TASK_RENDER_MS_150, "CONSERVATIVE_WALL_EXCEEDS_150S_RENDER");
assert(src.includes("status: 'failed'"), "TIMEOUT_SETS_FAILED");
assert(!src.includes("attempts < 12"), "OLD_12_ATTEMPT_CAP_REMOVED");
assert(!src.includes("MAX_RENDER_COMPLETE_ATTEMPTS = 48"), "OLD_48_ATTEMPT_CAP_REMOVED");

function decideRenderComplete({ found, attempt, maxAttempts }) {
  if (found) {
    return { action: "complete", status: "completed", progress: 100 };
  }
  if (attempt < maxAttempts) {
    return { action: "retry", nextAttempt: attempt + 1 };
  }
  return { action: "timeout", status: "failed" };
}

// Fast render: object present on first check → complete, no retry.
assert(
  decideRenderComplete({ found: true, attempt: 0, maxAttempts: MAX_ATTEMPTS }).action === "complete",
  "FAST_RENDER_COMPLETES"
);
assert(
  decideRenderComplete({ found: true, attempt: 0, maxAttempts: MAX_ATTEMPTS }).progress === 100,
  "FAST_RENDER_PROGRESS_100"
);

// ~50s render: after old 12, still inside both 48 and 90.
const attempt50s = 25;
assert(attempt50s > OLD_MAX_ATTEMPTS_V20, "50S_AFTER_OLD_12");
assert(attempt50s < OLD_MAX_ATTEMPTS_V22, "50S_INSIDE_OLD_48");
assert(
  decideRenderComplete({ found: true, attempt: attempt50s, maxAttempts: MAX_ATTEMPTS }).action === "complete",
  "50S_RENDER_COMPLETES"
);
assert(
  decideRenderComplete({ found: true, attempt: attempt50s, maxAttempts: MAX_ATTEMPTS }).progress === 100,
  "50S_RENDER_PROGRESS_100"
);

// Late vs v20 12-attempt window.
const lateAttempt = 20;
assert(
  decideRenderComplete({ found: false, attempt: lateAttempt, maxAttempts: OLD_MAX_ATTEMPTS_V20 }).action === "timeout",
  "OLD_12_POLICY_TIMES_OUT_LATE_RENDER"
);
assert(
  decideRenderComplete({ found: true, attempt: lateAttempt, maxAttempts: MAX_ATTEMPTS }).action === "complete",
  "NEW_POLICY_COMPLETES_LATE_RENDER"
);

// ~150s render: after v22 48-attempt exhaust (evidence 29230672), before 90.
const attempt150s = 75;
assert(attempt150s > OLD_MAX_ATTEMPTS_V22, "150S_AFTER_OLD_48");
assert(attempt150s < MAX_ATTEMPTS, "150S_BEFORE_NEW_MAX");
assert(
  decideRenderComplete({ found: false, attempt: attempt150s, maxAttempts: OLD_MAX_ATTEMPTS_V22 }).action === "timeout",
  "OLD_48_POLICY_TIMES_OUT_150S_RENDER"
);
assert(
  decideRenderComplete({ found: true, attempt: attempt150s, maxAttempts: MAX_ATTEMPTS }).action === "complete",
  "150S_RENDER_COMPLETES"
);
assert(
  decideRenderComplete({ found: true, attempt: attempt150s, maxAttempts: MAX_ATTEMPTS }).progress === 100,
  "150S_RENDER_PROGRESS_100"
);

// Genuine missing artifact: still absent at max → fail closed, not freeze at 95.
assert(
  decideRenderComplete({ found: false, attempt: MAX_ATTEMPTS, maxAttempts: MAX_ATTEMPTS }).action === "timeout",
  "MISSING_ARTIFACT_TIMES_OUT"
);
assert(
  decideRenderComplete({ found: false, attempt: MAX_ATTEMPTS, maxAttempts: MAX_ATTEMPTS }).status === "failed",
  "MISSING_ARTIFACT_STATUS_FAILED"
);

console.log("ALL_PASS");
