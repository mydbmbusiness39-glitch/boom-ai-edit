#!/usr/bin/env node
/**
 * Contract tests for Status.tsx jobs_new poll: no error column in select.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/pages/Status.tsx"), "utf8");

function assert(cond, name) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`PASS ${name}`);
}

// Status.tsx now contains TWO jobs_new selects: a 1-column id lookup that
// resolves bare /status, and the original poll query. Match the poll query
// (the one carrying output_url) so this contract keeps testing the same thing.
const selectMatches = [...src.matchAll(/\.from\("jobs_new"\)\s*\.select\(\s*"([^"]+)"\s*\)/g)];
const pollMatch = selectMatches.find((m) => m[1].includes("output_url"));
assert(!!pollMatch, "STATUS_SELECT_PRESENT");
const cols = pollMatch[1].split(",").map((s) => s.trim());
const required = [
  "id",
  "name",
  "status",
  "progress",
  "output_url",
  "files",
  "style_id",
  "duration",
  "created_at",
  "updated_at",
  "watermarked",
];
assert(!cols.includes("error"), "STATUS_QUERY_WITHOUT_ERROR");
assert(required.every((c) => cols.includes(c)) && cols.length === required.length, "EXISTING_FIELDS_PRESERVED");
assert(/error:\s*undefined/.test(src), "LOCAL_ERROR_MAPPING");
assert(!/data\.error/.test(src), "NO_DATA_ERROR_READ");
assert(src.includes("Job not found or you no longer have access."), "JOB_NOT_FOUND_REGRESSION");
assert(src.includes("UUID_REGEX"), "UUID_GUARD_PRESENT");
assert(src.indexOf("UUID_REGEX.test") < pollMatch.index, "UUID_BEFORE_QUERY");

console.log("ALL_PASS");
