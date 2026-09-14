#!/usr/bin/env node
/**
 * Bare /status routing contract.
 * A missing :jobId must resolve a REAL job for the signed-in user, never a
 * fabricated id and never another user's row.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function pass(name, ok, detail = "") {
  if (ok) {
    console.log("PASS", name);
  } else {
    failed += 1;
    console.log("FAIL", name, detail);
  }
}

const status = readFileSync(path.join(root, "src/pages/Status.tsx"), "utf8");
const index = readFileSync(path.join(root, "src/pages/Index.tsx"), "utf8");
const nav = readFileSync(path.join(root, "src/components/Layout/Navigation.tsx"), "utf8");
const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");

pass("STATUS_ROUTE_WITH_PARAM", app.includes('path="/status/:jobId"'));
pass("STATUS_ROUTE_BARE", app.includes('path="/status"'));

// bare route must NOT simply bail out
pass("BARE_ROUTE_RESOLVES_JOB", status.includes("resolveLatestJob"));
pass(
  "BARE_ROUTE_NO_EARLY_BAIL",
  !/if \(!jobId\) \{\s*\n\s*setIsLoading\(false\);\s*\n\s*return;\s*\n\s*\}/.test(status),
);

// owner scoping + real data only
pass("QUERIES_JOBS_NEW", status.includes('.from("jobs_new")'));
pass("FILTERS_BY_SESSION_USER", status.includes('.eq("user_id", uid)'));
pass("REQUIRES_COMPLETED", status.includes('.eq("status", "completed")'));
pass("REQUIRES_OUTPUT_URL", status.includes('.not("output_url", "is", null)'));
pass("LATEST_FIRST", status.includes('.order("created_at", { ascending: false })') && status.includes(".limit(1)"));
pass("HARDCODED_UUID_ABSENT", !/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(status));
pass("NAVIGATES_TO_RESOLVED_ID", status.includes("navigate(`/status/${data.id}`, { replace: true })"));
pass("PREFERS_STORED_JOB_ID", status.includes('localStorage.getItem("currentJobId")'));
pass("UUID_VALIDATED_BEFORE_USE", status.includes("UUID_REGEX.test(stored)"));
pass("NO_FABRICATED_JOB", !status.includes("demo-job"));

// messaging must not render a raw undefined
pass(
  "NO_UNDEFINED_IN_MESSAGE",
  !/The job with ID "\$\{jobId\}" could not be found\.`\}/.test(status) &&
    status.includes('jobId ? `The job with ID "${jobId}" could not be found.` : "No render selected."'),
);

// other entry points
pass("NAV_LINK_IS_BARE_STATUS", nav.includes('{ href: "/status", label: "Status"'));
pass("HOME_CARD_NOT_FAKE_JOB", !index.includes("/status/demo-job") && index.includes('href: "/status"'));
pass("COMPLETION_STILL_NAVIGATES_WITH_ID", readFileSync(path.join(root, "src/pages/Editor.tsx"), "utf8").includes("navigate(`/status/${jobId}`)"));

if (failed) {
  console.log(`TEST_RESULTS=FAIL ${failed}`);
  process.exit(1);
}
console.log("TEST_RESULTS=ALL_PASS");
