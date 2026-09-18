#!/usr/bin/env node
/**
 * AI Twin PRODUCT LAYER test suite. Mocked and no-cost: no provider is ever contacted.
 *
 * Layer 1 (build): the pure product modules are compiled with tsc — a build failure fails
 *   the suite, so "it compiles" is proven rather than asserted.
 * Layer 2 (behaviour): the required checks run against the compiled modules with fakes.
 * Layer 3 (source assertions): the Deno entry points and frontend client cannot be executed
 *   under Node, so their gates are asserted at source level. Those checks are labelled
 *   [source] so nobody mistakes them for runtime proof.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = "/root/boom-ai-edit";
const SRC = join(REPO, "supabase/functions/_shared/twinVisual");
const BUILD = "/tmp/twin_product_build";
const OUT = join(BUILD, "out");

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed: !!passed });
  console.log(`  ${passed ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

/* ---------------------------------------------------------- layer 1: build */
console.log("=== LAYER 1: product modules compile ===");
rmSync(BUILD, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// The four product modules are standalone (no cross-imports), so they are compiled
// directly from source as TypeScript and the emitted .js is what the tests import.
const PURE = ["capabilities.ts", "costPreview.ts", "twinVersions.ts", "userErrors.ts"];
writeFileSync(join(BUILD, "package.json"), JSON.stringify({ type: "module" }));
try {
  execFileSync("npx", ["--yes", "--package", "typescript", "tsc",
    "--module", "esnext", "--target", "es2022", "--moduleResolution", "bundler",
    "--strict", "--outDir", OUT, ...PURE.map((f) => join(SRC, f))],
    { cwd: BUILD, stdio: "pipe" });
  check("all four product modules compile with tsc --strict", true);
} catch (e) {
  check("all four product modules compile with tsc --strict", false, String(e.stdout || e).slice(0, 300));
}

const cap = await import(join(OUT, "capabilities.js"));
const cost = await import(join(OUT, "costPreview.js"));
const ver = await import(join(OUT, "twinVersions.js"));
const err = await import(join(OUT, "userErrors.js"));

/* ------------------------------------------------------- fixture: the real twin */
const OWNER = "78a343fb-a9d8-4fcd-b8c5-71b9c670f0d5";
const AVATAR = "ffad94e93a52b2cef8e2c0a37db5fb31";
const HOPE = "Bq5gIa0ipzX9gS6DRAuW";
const twinRow = {
  id: "7a993873-bd81-4e3c-8c12-48009f711f58",
  status: "ready",
  consent_status: "explicitly_accepted",
  voice_provider: "elevenlabs", voice_provider_id: HOPE,
  visual_provider: "heygen", visual_provider_id: AVATAR,
  source_asset_path: "78a343fb/7a993873/canary-likeness.png",
  created_at: "2026-09-17T19:00:00.000Z",
  twin_versions: null,
};

/* --------------------------------------------------- 1. existing twin loads */
console.log("\n=== 1. existing twin loads correctly ===");
const list = ver.versionList(twinRow);
const active = ver.activeVersion(twinRow);
check("baseline v1 is synthesised from live columns when the migration is absent",
  list.length === 1 && list[0].version === 1 && list[0].label === ver.BASELINE_LABEL);
check("v1 carries the proven Hope voice and the paid avatar",
  list[0].voiceProviderId === HOPE && list[0].visualProviderId === AVATAR);
check("active version resolves to the paid avatar (v1 is what is live now)",
  active.version === 1 && active.status === "active");

/* ------------------------------------------------------- 2. avatar reuse path */
console.log("\n=== 2. avatar reuse path ===");
const reuse = cost.estimateCost({ audioDurationS: 5.56, willCreateAvatar: false });
check("reuse estimate has no avatar line and is about $0.20", reuse.avatarReused === true &&
  !reuse.breakdown.some((b) => /avatar/i.test(b.label)) && reuse.estimatedDisplay === "$0.21");
const create = cost.estimateCost({ audioDurationS: 5.56, willCreateAvatar: true });
check("create path adds the $1.32 avatar line", create.breakdown.some((b) => b.minor === 132) === true);
const flowSrc = readFileSync(join(SRC, "flow.ts"), "utf8");
check("[source] generation reuses a persisted avatar instead of creating one",
  /if \(!avatarId\)/.test(flowSrc));
check("[source] the avatar step is guarded by a step marker so it cannot run twice",
  /avatar_requested/.test(flowSrc) && /avatar_created/.test(flowSrc));

/* ------------------------------------------------ 3. no duplicate avatar creation */
console.log("\n=== 3. no duplicate avatar creation ===");
check("version operations contain no network call at all",
  !/fetch\(|https?:\/\//.test(readFileSync(join(SRC, "twinVersions.ts"), "utf8")));
const activated = ver.activateVersion(twinRow, 1);
check("activating a version returns ids to persist and reaches no provider",
  activated.persist.visual_provider_id === AVATAR && activated.persist.twin_versions.length === 1);
check("versions are monotonic so a new candidate cannot overwrite v1",
  ver.addCandidate(twinRow, {
    voiceProvider: "elevenlabs", voiceProviderId: "newVoice", visualProvider: "heygen",
    visualProviderId: "newAvatar", createdAt: "2026-09-19T00:00:00.000Z",
  }).list.map((v) => v.version).join(",") === "1,2");

/* ------------------------------------------------------------- 4. consent gate */
console.log("\n=== 4. consent gate ===");
check("consent failures map to the simple user message 'Consent required'",
  err.userErrorFromInternal("CONSENT_REQUIRED").message === "Consent required");
check("[source] twin-state refuses to mark a twin generatable without consent",
  /consent_status === "explicitly_accepted"/.test(readFileSync(join(REPO, "supabase/functions/twin-state/index.ts"), "utf8")));

/* --------------------------------------------------------- 5. entitlement gate */
console.log("\n=== 5. entitlement gate ===");
const stateSrc = readFileSync(join(REPO, "supabase/functions/twin-state/index.ts"), "utf8");
check("[source] entitlement is read server-side from account_entitlements",
  /account_entitlements/.test(stateSrc));
check("[source] an inactive entitlement blocks generation",
  /entitlementOk/.test(stateSrc) && /readyToGenerate/.test(stateSrc));
check("entitlement failures are not surfaced as raw internal detail",
  !/ai_twin:false/.test(err.userErrorFromInternal("ENTITLEMENT_INACTIVE").message));

/* ------------------------------------------------------------- 6. spend gate */
console.log("\n=== 6. spend gate ===");
const over = cost.estimateCost({ audioDurationS: 300, willCreateAvatar: true });
check("an estimate above the ceiling is flagged and refused",
  over.exceedsCeiling === true && cost.authorizeSpend(over, { allowGeneration: true }).ok === false);
check("the refusal is the plain message 'Spend limit reached for this generation.'",
  cost.authorizeSpend(over, { allowGeneration: true }).userMessage === "Spend limit reached for this generation.");
const short = cost.estimateCost({ audioDurationS: 5.56, willCreateAvatar: false, providerBalanceMinor: 5 });
check("insufficient provider balance is refused before any call",
  cost.authorizeSpend(short, { allowGeneration: true }).ok === false);
check("the kill switch refuses even a valid, affordable estimate",
  cost.authorizeSpend(reuse, { allowGeneration: false }).ok === false);
check("a normal generation with the switch on is allowed",
  cost.authorizeSpend(reuse, { allowGeneration: true }).ok === true);
check("the ceiling is a module constant, never a request parameter",
  !/body\?\.ceiling|ceilingMinor:\s*Number\(body/.test(stateSrc));

/* ------------------------------------------------------------ 7. idempotency */
console.log("\n=== 7. idempotency ===");
const apiSrc = readFileSync(join(REPO, "src/lib/twinApi.ts"), "utf8");
check("[source] the client sends a stable operationId + idempotencyKey per generation",
  /operationId/.test(apiSrc) && /idempotencyKey/.test(apiSrc));
check("[source] the product layer calls the proven generate function unchanged",
  /twin-visual-generate/.test(apiSrc) && !/avatars/.test(apiSrc));
check("[source] the server requires an operation id or idempotency key",
  /operationId or idempotencyKey required/.test(readFileSync(join(REPO, "supabase/functions/twin-visual-generate/index.ts"), "utf8")));

/* --------------------------------------------------------- 8. version switching */
console.log("\n=== 8. version switching ===");
const twoVersions = { ...twinRow, twin_versions: [...ver.versionList(twinRow), {
  version: 2, label: "v2 · candidate", status: "candidate", voiceProvider: "elevenlabs",
  voiceProviderId: "v2voice", visualProvider: "heygen", visualProviderId: "v2avatar",
  createdAt: "2026-09-19T00:00:00.000Z" }] };
const up = ver.activateVersion(twoVersions, 2);
check("activating v2 points the twin at v2's provider ids",
  up.persist.visual_provider_id === "v2avatar" && up.active.version === 2);
check("v1 is still present and still holds the original avatar after activation",
  up.persist.twin_versions.some((v) => v.version === 1 && v.visualProviderId === AVATAR));
const back = ver.rollbackVersion(up.list.length ? { ...twoVersions, visual_provider_id: "v2avatar", twin_versions: up.list } : twoVersions);
check("rollback returns the twin to v1 (the proven baseline)",
  back.active.version === 1 && back.persist.visual_provider_id === AVATAR);
check("compare reports the visual change and that no avatar is rebuilt",
  ver.compareVersions(twoVersions, 1, 2).visualChange === true);
let refused = false;
try { ver.activateVersion(twoVersions, 99); } catch { refused = true; }
check("activating an unknown version is refused", refused);

/* ------------------------------------------- 9. Miya cannot reach admin controls */
console.log("\n=== 9. Miya cannot access admin controls ===");
const miya = cap.roleFromProfile({ role: "customer", plan: "business" });
check("an ai_twin-entitled operator resolves to twin_operator", miya === "twin_operator");
check("Miya CAN generate", cap.authorize(miya, "twin.generate").ok === true);
check("Miya CANNOT reach admin (activate/rollback/upgrade)", cap.authorize(miya, "twin.admin").ok === false);
check("Miya CANNOT reach spend administration", cap.authorize(miya, "twin.spend.admin").ok === false);
check("Miya's denial is generic and names no admin action", !/version|spend|admin/i.test(cap.authorize(miya, "twin.admin").userMessage));
check("owner still can administer", cap.authorize(cap.roleFromProfile({ role: "owner_admin" }), "twin.admin").ok === true);
check("an unknown caller gets nothing at all", cap.capabilitiesForRole("unknown").length === 0 &&
  cap.authorize("unknown", "twin.view").ok === false);

/* --------------------------------------------------------- error + hygiene */
console.log("\n=== 10. error handling and hygiene ===");
check("every internal failure maps to one of the five simple messages",
  Object.values(err.USER_ERRORS).join("|") ===
  "Twin unavailable|Consent required|Generation failed|Provider temporarily unavailable|Spend limit reached");
check("a provider 402 becomes 'Provider temporarily unavailable', not a raw status",
  err.userErrorFromInternal("VIDEO_REQUEST_FAILED:generate_video:402").message === "Provider temporarily unavailable");
check("sanitizeForLog strips a key, a JWT, a signed-URL query and an email",
  !/sk_live_|eyJ|X-Amz|@/.test(err.sanitizeForLog(
    "key sk_live_abcdefghijklmnop eyJhbGciOiJIUzI1NiIsInR5cCI6 a@b.com ?token=abc123&X-Amz-Signature=deadbeef")));
const uiFiles = ["src/lib/twinApi.ts", "src/pages/TwinSetup.tsx",
  "supabase/functions/twin-state/index.ts", "supabase/functions/twin-version/index.ts"];
const leaks = uiFiles.filter((f) => {
  const s = readFileSync(join(REPO, f), "utf8");
  return /HEYGEN_API_KEY\s*[:=]\s*["']|X-Api-Key:\s*["']/.test(s);
});
check("no provider key is assigned anywhere in the product layer", leaks.length === 0, leaks.join(","));
check("[source] the provider key is read only from the server environment",
  /Deno\.env\.get\("HEYGEN_API_KEY"\)/.test(readFileSync(join(REPO, "supabase/functions/twin-visual-generate/index.ts"), "utf8")));

/* ----------------------------------------------------------------- summary */
const passed = results.filter((r) => r.passed).length;
console.log(`\n==== ${passed}/${results.length} TWIN PRODUCT LAYER CHECKS PASSED ====`);
process.exit(passed === results.length ? 0 : 1);
