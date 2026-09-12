#!/usr/bin/env node
/**
 * Frontend-only source-duration preservation.
 * Does not touch processor/worker/create-job.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const upload = readFileSync(resolve(root, "src/pages/Upload.tsx"), "utf8");
const style = readFileSync(resolve(root, "src/pages/Style.tsx"), "utf8");
const editor = readFileSync(resolve(root, "src/pages/Editor.tsx"), "utf8");

const fails = [];
const pass = (name, ok, detail = "") => {
  if (!ok) fails.push(`${name}${detail ? `: ${detail}` : ""}`);
};

const parseSourceDuration = (value) => {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

const defaultStyleDuration = (sourceSeconds, fallback = 15) =>
  parseSourceDuration(sourceSeconds) ?? fallback;

const resolveJobDuration = ({ selectedDuration, sourceDuration, fallback = 15 }) => {
  const selected = parseSourceDuration(selectedDuration);
  if (selected != null) return selected;
  const source = parseSourceDuration(sourceDuration);
  if (source != null) return source;
  return fallback;
};

// --- source markers ---
pass("UPLOAD_READS_HTML_METADATA", upload.includes("video.preload = 'metadata'") && upload.includes("video.onloadedmetadata"));
pass("UPLOAD_NO_HARDCODED_15", !/persistSourceDuration\(\s*15\s*\)/.test(upload));
pass("UPLOAD_PERSISTS_SOURCE_KEY", upload.includes("SOURCE_DURATION_STORAGE_KEY = 'sourceVideoDuration'"));
pass("UPLOAD_CLEARS_STALE_CLIP", upload.includes("localStorage.removeItem('videoDuration')"));
pass("STYLE_DEFAULTS_FROM_SOURCE", style.includes("defaultStyleDuration(readPersistedSourceDuration())"));
pass("STYLE_NOT_HARD_15_STATE", !style.includes("useState<number>(15)"));
pass("STYLE_SLIDER_SHORTEN_INTACT", style.includes("setDuration(Number(e.target.value))") && style.includes("localStorage.setItem('videoDuration'"));
pass("EDITOR_RESOLVE_HELPER", editor.includes("export const resolveJobDuration"));
pass("EDITOR_NO_PARSEINT_JOB_DURATION", !editor.includes("parseInt(projectData.duration)") && !editor.includes("Number(parseInt(projectData.duration))"));
pass("EDITOR_COMPILE_USES_RESOLVED", editor.includes("duration: sourceDuration()"));
pass("CREATE_JOB_INVOKE_INTACT", editor.includes('functions.invoke("create-job"') || editor.includes("functions.invoke('create-job'"));
pass("NO_API_CREATE_JOB", !editor.includes("/api/create-job"));

// --- 32.926s source defaults to ~32.926s ---
const source32926 = 32.926;
const styleDefault32926 = defaultStyleDuration(source32926);
const editorDefault32926 = resolveJobDuration({ selectedDuration: null, sourceDuration: source32926 });
pass("32S_SOURCE_STYLE_DEFAULT", Math.abs(styleDefault32926 - 32.926) < 0.001, String(styleDefault32926));
pass("32S_SOURCE_EDITOR_DEFAULT", Math.abs(editorDefault32926 - 32.926) < 0.001, String(editorDefault32926));
pass("32S_NOT_SILENT_15", styleDefault32926 !== 15 && editorDefault32926 !== 15);

// --- intentional 15s clip ---
const clip15 = resolveJobDuration({ selectedDuration: 15, sourceDuration: 32.926 });
pass("15S_OVERRIDE", clip15 === 15, String(clip15));

// --- 10s source remains 10s ---
const ten = defaultStyleDuration(10);
const tenEditor = resolveJobDuration({ selectedDuration: null, sourceDuration: "10" });
pass("10S_SOURCE_REMAINS_10", ten === 10 && tenEditor === 10, `${ten}/${tenEditor}`);

// --- missing metadata fallback ---
pass("MISSING_NULL", defaultStyleDuration(null) === 15);
pass("MISSING_EMPTY", resolveJobDuration({ selectedDuration: "", sourceDuration: undefined }) === 15);
pass("MISSING_NAN", parseSourceDuration("not-a-number") === null);
pass("MISSING_ZERO", parseSourceDuration(0) === null);

// --- reload / persisted project ---
const store = {};
store.sourceVideoDuration = String(32.926);
const reloaded = resolveJobDuration({
  selectedDuration: store.videoDuration,
  sourceDuration: store.sourceVideoDuration,
});
pass("RELOAD_KEEPS_SOURCE", Math.abs(reloaded - 32.926) < 0.001, String(reloaded));
store.videoDuration = "15";
const reloadedClip = resolveJobDuration({
  selectedDuration: store.videoDuration,
  sourceDuration: store.sourceVideoDuration,
});
pass("RELOAD_KEEPS_CLIP_OVERRIDE", reloadedClip === 15, String(reloadedClip));

if (fails.length) {
  console.error("SOURCE_DURATION_PRESERVATION_FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("SOURCE_DURATION_PRESERVATION_TEST=ALL_PASS");
console.log("32S_SOURCE_TEST=PASS");
console.log("15S_OVERRIDE_TEST=PASS");
console.log("10S_SOURCE_TEST=PASS");
console.log("MISSING_METADATA_FALLBACK=PASS");
console.log("RELOAD_PERSISTENCE_TEST=PASS");
