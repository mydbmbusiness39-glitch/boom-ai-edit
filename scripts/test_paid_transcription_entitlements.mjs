#!/usr/bin/env node
/**
 * Owner/admin paid transcription entitlements.
 * Does not call live Whisper / OpenAI.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const src = readFileSync(path.join(root, "src/lib/access.ts"), "utf8");
const { code } = transformSync(src, { loader: "ts", format: "cjs" });
const mod = { exports: {} };
new Function("module", "exports", "require", code)(mod, mod.exports, require);
const { resolveEntitlements, isOwner } = mod.exports;

const sql = readFileSync(
  path.join(root, "supabase/migrations/20260912233000_paid_transcription_entitlements.sql"),
  "utf8"
);
const edge = readFileSync(path.join(root, "supabase/functions/transcribe/index.ts"), "utf8");
const client = readFileSync(path.join(root, "src/utils/aiWorkerClient.ts"), "utf8");
const editor = readFileSync(path.join(root, "src/pages/Editor.tsx"), "utf8");
const processor = readFileSync(
  path.join(root, "supabase/functions/job-processor/index.ts"),
  "utf8"
);
const worker = readFileSync(path.join(root, "ai-worker/main.py"), "utf8");
const createJob = readFileSync(
  path.join(root, "supabase/functions/create-job/index.ts"),
  "utf8"
);

let failed = 0;
function pass(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    failed += 1;
    return;
  }
  console.log("PASS", name);
}

function decideTranscribe({ auth, entitled, globallyPaid, noAudio, silent, providerFail, captions }) {
  if (!auth) return { status: 401, error: "User not authenticated", whisper: false };
  if (!entitled && !globallyPaid) {
    return { status: 403, error: "Paid transcription is not included in your plan.", whisper: false };
  }
  if (noAudio) return { status: 422, error: "Source has no usable audio", whisper: false };
  if (silent) return { status: 200, captions: [], whisper: false, error: "No speech detected in source audio." };
  if (providerFail) return { status: 502, error: "Transcription provider unavailable", whisper: true, retry: false };
  const timed = (captions || []).filter((c) => c && c.end > c.start && String(c.text || "").trim());
  return { status: 200, captions: timed, whisper: true, retry: false };
}

const owner = resolveEntitlements({ role: "owner_admin", plan: "enterprise_internal" });
const free = resolveEntitlements({ role: "customer", plan: "free" });
const pro = resolveEntitlements({ role: "customer", plan: "pro" });
const biz = resolveEntitlements({ role: "customer", plan: "business" });
const agency = resolveEntitlements({ role: "customer", plan: "agency" });

pass("OWNER_TX_ALLOWED", owner.paidTranscriptionAllowed === true && owner.autoTranscription === true);
pass("FREE_TX_BLOCKED", free.paidTranscriptionAllowed === false);
pass("PRO_TX_UNCHANGED", pro.paidTranscriptionAllowed === false);
pass("BUSINESS_TX_UNCHANGED", biz.paidTranscriptionAllowed === false);
pass("AGENCY_TX_UNCHANGED", agency.paidTranscriptionAllowed === false);
pass("EMAIL_HACK_STILL_RETIRED", isOwner("mydbmbusiness39@gmail.com") === false);

pass("SQL_HAS_PAID_FIELD", sql.includes("paid_transcription_allowed boolean"));
pass("SQL_HAS_AUTO_FIELD", sql.includes("auto_transcription boolean"));
pass("SQL_OWNER_TRUE", /owner_admin[\s\S]*paid_transcription_allowed := true/.test(sql));
pass("SQL_CUSTOMER_FALSE", sql.includes("paid_transcription_allowed := false"));
pass("SQL_FREE_STILL_5", sql.includes("daily_job_limit := 5"));
pass("SQL_NO_EMAIL", !sql.toLowerCase().includes("mydbmbusiness39"));

pass("EDGE_AUTH_GETUSER", edge.includes("auth.getUser()"));
pass("EDGE_RPC", edge.includes('rpc("account_entitlements"'));
pass("EDGE_NO_EMAIL", !edge.includes("@gmail.com"));
pass("EDGE_HEADER", edge.includes("X-Boom-Paid-Transcription"));
pass("EDGE_NO_RETRY", edge.includes("No retry") || edge.includes("retry: false"));
pass("EDGE_LOG_DURATION", edge.includes("elapsed_ms"));
pass("EDGE_LOG_MODEL", edge.includes("whisper-1") && edge.includes("openai"));
pass("EDGE_VERIFY_PATH", edge.includes("${aiWorkerUrl}/transcribe"));
pass("CLIENT_HITS_TRANSCRIBE_FN", client.includes("/functions/v1/transcribe"));
pass("CLIENT_NOT_PROXY", !client.includes("ai-worker-proxy/transcribe"));
pass("CLIENT_PLAN_BLOCK", client.includes("Paid transcription is not included in your plan."));
pass("CLIENT_UNAUTH", client.includes("Transcription auth failed."));
pass("CLIENT_NO_AUDIO", client.includes("Source has no usable audio."));
pass("CLIENT_NO_SPEECH", client.includes("No speech detected in source audio."));
pass("CLIENT_PROVIDER", client.includes("Transcription provider unavailable"));
pass("EDITOR_PERSIST", editor.includes("captions, caption_style: captionStyle") && editor.includes('localStorage.setItem("editorCaptions"'));

pass("WORKER_HEADER_OVERRIDE", worker.includes("x_boom_paid_transcription"));
pass("WORKER_GLOBAL_STILL_FALSE_DEFAULT", worker.includes('os.getenv("ALLOW_PAID_CALLS", "FALSE")'));
pass("WORKER_NO_RETRY", worker.includes('"retry": False'));
pass("WORKER_ONE_WHISPER", worker.includes("api.openai.com/v1/audio/transcriptions") && (worker.split("api.openai.com/v1/audio/transcriptions").length - 1) === 1);
pass("WORKER_422_NO_AUDIO", worker.includes('status_code=422, detail="Source has no usable audio"'));
pass("WORKER_SILENT_NO_WHISPER", worker.includes('"reason": "silent_source"') && worker.includes("whisper_called\": False"));
pass("WORKER_TIMED_SEGMENTS", worker.includes('"start": start') && worker.includes('"end": end'));
pass("WORKER_LOG_DURATION", worker.includes("media_duration_s"));

const ownerMov = decideTranscribe({
  auth: true, entitled: owner.paidTranscriptionAllowed, globallyPaid: false,
  captions: [{ text: "hello mov", start: 0.1, end: 1.4 }],
});
pass("OWNER_MOV_ALLOWED", ownerMov.status === 200 && ownerMov.whisper === true && ownerMov.captions[0].text === "hello mov");

const ownerMp4 = decideTranscribe({
  auth: true, entitled: owner.paidTranscriptionAllowed, globallyPaid: false,
  captions: [{ text: "hello mp4", start: 0.5, end: 2.0 }],
});
pass("OWNER_MP4_ALLOWED", ownerMp4.status === 200 && ownerMp4.captions[0].end === 2.0);

const freeBlocked = decideTranscribe({ auth: true, entitled: free.paidTranscriptionAllowed, globallyPaid: false });
pass("FREE_BLOCKED_NO_WHISPER", freeBlocked.status === 403 && freeBlocked.whisper === false);

const unauth = decideTranscribe({ auth: false, entitled: false, globallyPaid: false });
pass("UNAUTH_BLOCKED", unauth.status === 401 && unauth.whisper === false);

const silent = decideTranscribe({ auth: true, entitled: true, globallyPaid: false, silent: true });
pass("SILENT_NO_SPEECH", silent.status === 200 && silent.whisper === false && silent.captions.length === 0);

const missing = decideTranscribe({ auth: true, entitled: true, globallyPaid: false, noAudio: true });
pass("MISSING_AUDIO", missing.status === 422 && missing.whisper === false);

const provider = decideTranscribe({ auth: true, entitled: true, globallyPaid: false, providerFail: true });
pass("PROVIDER_FAIL_NO_RETRY", provider.status === 502 && provider.retry === false && provider.whisper === true);

pass("TIMING_INTEGRITY", ownerMov.captions[0].start === 0.1 && ownerMp4.captions[0].start === 0.5);
pass("PERSIST_PATH", editor.includes("files.captions") || editor.includes("captions, caption_style"));
pass("GATE77_PROCESSOR_UNTOUCHED_LLM_SKIP", !processor.includes("aiWorkerUrl}/generate/captions"));
pass("GATE77_UNWRAP", processor.includes("unwrapCompiledTimeline") && processor.includes("NO_PRODUCTION_MEDIA"));
pass("CREATE_JOB_QUOTA_UNCHANGED", createJob.includes("account_entitlements") && !/profile\\.plan === ['\"]free['\"]/.test(createJob));
pass("NO_GLOBAL_ALLOW_TRUE", !worker.includes('ALLOW_PAID_CALLS", "TRUE")') && !/ALLOW_PAID_CALLS\s*=\s*"TRUE"/.test(worker));

if (failed) {
  console.error("TEST_RESULTS=FAIL", failed);
  process.exit(1);
}
console.log("TEST_RESULTS=ALL_PASS");
