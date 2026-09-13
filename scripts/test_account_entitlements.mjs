#!/usr/bin/env node
/**
 * Owner/admin entitlements vs Free/Pro/Business/Agency.
 * Mirrors public.account_entitlements. Does not call live create-job.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const src = readFileSync(path.join(root, "src/lib/access.ts"), "utf8");
const { code } = transformSync(src, { loader: "ts", format: "cjs" });
const mod = { exports: {} };
const fn = new Function("module", "exports", "require", code);
fn(mod, mod.exports, require);
const { resolveEntitlements, isOwnerAdmin, isOwner } = mod.exports;

let failed = 0;
function pass(name, cond) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    failed += 1;
    return;
  }
  console.log(`PASS ${name}`);
}

function canCreate(ent, todayCount) {
  if (ent.dailyJobLimit == null) return true;
  return todayCount < ent.dailyJobLimit;
}

const owner = resolveEntitlements({ role: "owner_admin", plan: "enterprise_internal" });
pass("OWNER_ROLE", owner.role === "owner_admin");
pass("OWNER_PLAN", owner.plan === "enterprise_internal");
pass("OWNER_UNLIMITED", owner.dailyJobLimit === null);
pass("OWNER_6TH_ALLOWED", canCreate(owner, 6) === true);
pass("OWNER_NO_WATERMARK", owner.watermark === false);
pass("OWNER_AI_TWIN", owner.aiTwin === true);
pass("OWNER_SOCIAL", owner.socialPublish === true);
pass("OWNER_ADMIN_TEST", owner.adminTest === true);
pass("OWNER_PAID_TX", owner.paidTranscriptionAllowed === true);
pass("OWNER_AUTO_TX", owner.autoTranscription === true);
pass("IS_OWNER_ADMIN", isOwnerAdmin({ role: "owner_admin", plan: "enterprise_internal" }) === true);

const free = resolveEntitlements({ role: "customer", plan: "free" });
pass("FREE_LIMIT_5", free.dailyJobLimit === 5);
pass("FREE_5TH_ALLOWED", canCreate(free, 4) === true);
pass("FREE_6TH_BLOCKED", canCreate(free, 5) === false);
pass("FREE_WATERMARK", free.watermark === true);
pass("FREE_NOT_OWNER", isOwnerAdmin(free) === false);
pass("FREE_TX_BLOCKED", free.paidTranscriptionAllowed === false && free.autoTranscription === false);

const pro = resolveEntitlements({ role: "customer", plan: "pro" });
pass("PRO_UNLIMITED", pro.dailyJobLimit === null);
pass("PRO_6TH_ALLOWED", canCreate(pro, 6) === true);
pass("PRO_NO_WATERMARK", pro.watermark === false);
pass("PRO_NO_ADMIN", pro.adminTest === false);
pass("PRO_TX_UNCHANGED_BLOCKED", pro.paidTranscriptionAllowed === false);

const biz = resolveEntitlements({ role: "customer", plan: "business" });
pass("BUSINESS_UNLIMITED", biz.dailyJobLimit === null);
pass("BUSINESS_AI_TWIN", biz.aiTwin === true);

const agency = resolveEntitlements({ role: "customer", plan: "agency" });
pass("AGENCY_UNLIMITED", agency.dailyJobLimit === null);
pass("AGENCY_SOCIAL", agency.socialPublish === true);

const unknown = resolveEntitlements({ role: "customer", plan: "gold" });
pass("UNKNOWN_FAILS_CLOSED_FREE", unknown.plan === "free" && unknown.dailyJobLimit === 5);

const unauth = resolveEntitlements(null);
pass("UNAUTH_IS_FREE_CUSTOMER", unauth.role === "customer" && unauth.plan === "free" && unauth.dailyJobLimit === 5);

pass("EMAIL_HACK_RETIRED", isOwner("mydbmbusiness39@gmail.com") === false);
pass("NO_EMAIL_OWNER_LIST", !src.includes("OWNER_EMAILS") || src.includes("retired"));

const createJob = readFileSync(path.join(root, "supabase/functions/create-job/index.ts"), "utf8");
pass("CREATE_JOB_RPC", createJob.includes("account_entitlements"));
pass("CREATE_JOB_NO_PLAN_EQ_FREE", !/profile\.plan === ['\"]free['\"]/.test(createJob));
pass("CREATE_JOB_FILES_AS_IS", /files:\s*jobRequest\.files/.test(createJob));
pass("CREATE_JOB_NO_MEDIA_WRAP", !/media:\s*jobRequest\.files/.test(createJob));
pass("CREATE_JOB_STILL_AUTH", createJob.includes("User not authenticated"));
pass("CREATE_JOB_STILL_NO_AUTH_HEADER", createJob.includes("No authorization header"));

const status = readFileSync(path.join(root, "src/pages/Status.tsx"), "utf8");
pass("STATUS_NO_EMAIL_OWNER", !status.includes("isOwner("));
pass("STATUS_WATERMARK_FROM_JOB", status.includes("job.watermarked"));

if (failed) {
  console.error(`TEST_RESULTS=FAIL ${failed}`);
  process.exit(1);
}
console.log("TEST_RESULTS=ALL_PASS");
