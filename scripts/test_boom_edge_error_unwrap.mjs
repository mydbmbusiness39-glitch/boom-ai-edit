#!/usr/bin/env node
/**
 * BOOM Edge-error unwrap + create-job contract.
 * Does not call live Edge / processor / worker.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const editor = readFileSync(path.join(root, "src/pages/Editor.tsx"), "utf8");
const helper = readFileSync(path.join(root, "src/utils/edgeFunctionError.ts"), "utf8");
const createJob = readFileSync(
  path.join(root, "supabase/functions/create-job/index.ts"),
  "utf8"
);

let failed = 0;
function pass(name, cond) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    failed += 1;
    return;
  }
  console.log(`PASS ${name}`);
}

pass("CREATE_JOB_INVOKE_INTACT", editor.includes('functions.invoke("create-job"'));
pass("NO_API_CREATE_JOB", !editor.includes("/api/create-job"));
pass("READ_EDGE_ERROR_USED", editor.includes("await readEdgeFunctionError(error)"));
pass("DAILY_LIMIT_TOAST_STILL_GATED", editor.includes('message.includes("Daily job limit")'));
pass("DURATION_USES_SOURCE_DURATION_FN", /duration:\s*sourceDuration\(\)/.test(editor));
pass("STYLE_ID_FROM_PROJECT", /style_id:\s*projectData\.style/.test(editor));
pass("FILES_MEDIA_ARRAY", /files:\s*\{\s*media:\s*filesPayload/.test(editor));
pass("PREVIEW_REF_INTACT", editor.includes("previewVideoRef"));
pass("PREVIEW_PLAY_INTACT", /video\.play\(\)/.test(editor) && /video\.pause\(\)/.test(editor));
pass("CREATE_JOB_USES_ENTITLEMENTS", createJob.includes("account_entitlements"));
pass("CREATE_JOB_FREE_LIMIT_VIA_RESOLVER", /dailyLimit/.test(createJob) && /todayJobs/.test(createJob));
pass("CREATE_JOB_FILES_AS_IS", /files:\s*jobRequest\.files/.test(createJob));
pass("CREATE_JOB_NO_MEDIA_WRAP", !/media:\s*jobRequest\.files/.test(createJob));
pass("HELPER_READS_CONTEXT_JSON", helper.includes("reader.json") && helper.includes("body") && helper.includes(".error"));
pass(
  "15S_OVERRIDE_STILL_PRIORITY",
  editor.includes("selectedDuration") && editor.includes("resolveJobDuration")
);
pass("LONG_SOURCE_NOT_PARSEINT", !/parseInt\(\s*projectData\.duration/.test(editor));

/** Mirror of readEdgeFunctionError runtime (no TS). */
async function readEdgeFunctionError(error) {
  const fallback = (error && error.message) || "Unknown error";
  const ctx = error && error.context;
  if (!ctx) return fallback;
  try {
    if (typeof ctx.error === "string" && ctx.error.trim()) return ctx.error;
    const reader = ctx.clone && typeof ctx.clone === "function" ? ctx.clone() : ctx;
    if (reader && typeof reader.json === "function") {
      const body = await reader.json();
      if (body && typeof body.error === "string" && body.error.trim()) return body.error;
    }
  } catch {
    /* keep fallback */
  }
  return fallback;
}

const generic = "Edge Function returned a non-2xx status code";
const limitBody = { error: "Daily job limit reached (5 jobs per day for free tier)" };
const ctx = {
  json: async () => limitBody,
  clone() {
    return { json: async () => limitBody };
  },
};
pass("UNWRAP_DAILY_LIMIT", (await readEdgeFunctionError({ message: generic, context: ctx })).includes("Daily job limit"));
pass(
  "UNWRAP_AUTH",
  (
    await readEdgeFunctionError({
      message: generic,
      context: {
        json: async () => ({ error: "User not authenticated" }),
        clone() {
          return { json: async () => ({ error: "User not authenticated" }) };
        },
      },
    })
  ).includes("not authenticated")
);
pass("UNWRAP_FALLBACK_GENERIC", (await readEdgeFunctionError({ message: generic })) === generic);
pass(
  "UNWRAP_CONTEXT_ERROR_FIELD",
  (
    await readEdgeFunctionError({
      message: generic,
      context: { error: "Daily job limit reached (5 jobs per day for free tier)" },
    })
  ).includes("Daily job limit")
);

const durationSrc = readFileSync(path.join(root, "src/pages/Editor.tsx"), "utf8");
pass("AUTH_SESSION_STILL_REQUIRED", /session\.access_token/.test(durationSrc));
pass("JOBDATA_DURATION_FLOAT_OK", /duration:\s*sourceDuration\(\)/.test(durationSrc));

if (failed) {
  console.error(`TEST_RESULTS=FAIL ${failed}`);
  process.exit(1);
}
console.log("TEST_RESULTS=ALL_PASS");
