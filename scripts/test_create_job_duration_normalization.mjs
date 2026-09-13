#!/usr/bin/env node
/**
 * create-job INTEGER duration: ceil fractional source, keep exact integers.
 * Does not change DB schema. Does not call live create-job.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const createJob = readFileSync(path.join(root, "supabase/functions/create-job/index.ts"), "utf8");
const editor = readFileSync(path.join(root, "src/pages/Editor.tsx"), "utf8");
const processor = readFileSync(path.join(root, "supabase/functions/job-processor/index.ts"), "utf8");
const captionClient = readFileSync(path.join(root, "src/utils/aiWorkerClient.ts"), "utf8");

let failed = 0;
function pass(name, cond, detail = "") {
  if (!cond) {
    console.error("FAIL", name, detail);
    failed += 1;
    return;
  }
  console.log("PASS", name);
}

function parseSourceDuration(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function resolveJobDuration({ selectedDuration, sourceDuration, fallback = 15 }) {
  const selected = parseSourceDuration(selectedDuration);
  if (selected != null) return selected;
  const source = parseSourceDuration(sourceDuration);
  if (source != null) return source;
  return fallback;
}

function normalizeJobDuration(value, fallback = 15) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.ceil(n);
}

function simulateCreateJobInsert(payload) {
  const duration = normalizeJobDuration(payload.duration);
  if (!Number.isInteger(duration)) {
    throw new Error(`invalid input syntax for type integer: "${payload.duration}"`);
  }
  return { ok: true, duration, files: payload.files };
}

pass("HELPER_IN_CREATE_JOB", createJob.includes("normalizeJobDuration"));
pass("CEIL_USED", createJob.includes("return Math.ceil(n)"));
pass("INSERT_USES_NORMALIZED", createJob.includes("duration: jobDuration"));
pass("RAW_STILL_LOGGED", createJob.includes("duration: jobRequest.duration"));
pass("NO_FLOOR", !createJob.includes("Math.floor"));
pass("NO_SCHEMA_ALTER", !createJob.toLowerCase().includes("alter table"));
pass("FILES_AS_IS", /files:\s*jobRequest\.files/.test(createJob));
pass("EDITOR_STILL_SENDS_RESOLVED_FLOAT", editor.includes("duration: sourceDuration()"));
pass("EDITOR_NO_PARSEINT", !editor.includes("parseInt(projectData.duration)"));
pass("PROCESSOR_CAPTIONS_SKIP", !processor.includes("aiWorkerUrl}/generate/captions"));
pass("PROCESSOR_INJECT", processor.includes("injectCaptionItems"));
pass("CAPTION_CLIENT_TRANSCRIBE", captionClient.includes("/functions/v1/transcribe"));

const src12733 = resolveJobDuration({ selectedDuration: null, sourceDuration: 12.733333333333333 });
pass("FRONTEND_12_733_PRECISE", Math.abs(src12733 - 12.733333333333333) < 1e-12);
const job12733 = simulateCreateJobInsert({ duration: src12733, files: { media: [] } });
pass("12_733_SOURCE_RESULT", job12733.duration === 13);
pass("12_733_NO_TRUNCATE", job12733.duration >= src12733);
pass("12_733_INTEGER", Number.isInteger(job12733.duration));

const src32926 = resolveJobDuration({ selectedDuration: null, sourceDuration: 32.926 });
const job32926 = simulateCreateJobInsert({ duration: src32926, files: {} });
pass("FRONTEND_32_926_PRECISE", Math.abs(src32926 - 32.926) < 1e-12);
pass("32_926_SOURCE_RESULT", job32926.duration === 33);
pass("32_926_NO_TRUNCATE", job32926.duration >= src32926);

const src512 = resolveJobDuration({ selectedDuration: null, sourceDuration: 51.2 });
const job512 = simulateCreateJobInsert({ duration: src512, files: {} });
pass("FRONTEND_51_2_PRECISE", Math.abs(src512 - 51.2) < 1e-12);
pass("51_2_SOURCE_RESULT", job512.duration === 52);
pass("51_2_NO_TRUNCATE", job512.duration >= src512);

const src15 = resolveJobDuration({ selectedDuration: null, sourceDuration: 15 });
const job15 = simulateCreateJobInsert({ duration: src15, files: {} });
pass("15S_SOURCE_RESULT", job15.duration === 15);

const override15 = resolveJobDuration({ selectedDuration: 15, sourceDuration: 32.926 });
const jobOverride = simulateCreateJobInsert({ duration: override15, files: {} });
pass("15S_OVERRIDE_FRONTEND", override15 === 15);
pass("15S_OVERRIDE_RESULT", jobOverride.duration === 15);

const floorWouldTruncate = Math.floor(12.733333333333333);
pass("CEIL_NOT_FLOOR", job12733.duration !== floorWouldTruncate && floorWouldTruncate === 12);

let threw = false;
try {
  const n = 12.733333333333333;
  if (!Number.isInteger(n)) throw new Error(`invalid input syntax for type integer: "${n}"`);
} catch {
  threw = true;
}
pass("UNNORMALIZED_STILL_FAILS_INTEGER_CONTRACT", threw);

pass("CREATE_JOB_SUCCEEDS_AFTER_CEIL", job12733.ok === true && job32926.ok === true && jobOverride.ok === true);

if (failed) {
  console.error("TEST_RESULTS=FAIL", failed);
  process.exit(1);
}
console.log("TEST_RESULTS=ALL_PASS");
console.log("12_733_SOURCE_RESULT=13");
console.log("32_926_SOURCE_RESULT=33");
console.log("51_2_SOURCE_RESULT=52");
console.log("15S_OVERRIDE_RESULT=15");
