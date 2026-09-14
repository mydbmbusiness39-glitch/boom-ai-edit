#!/usr/bin/env node
/**
 * Gate #78 Meta (Facebook Reels + Instagram Reels) contract tests.
 * Infrastructure only: no Meta credentials, no OAuth, no publishing.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(process.cwd());
const fn = (p) => path.join(root, "supabase/functions", p);
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const has = (p) => existsSync(p);

let pass = 0;
let fail = 0;
const ok = (name, cond, extra) => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}${extra ? ` :: ${extra}` : ""}`);
  }
};

const MIGRATION = path.join(root, "supabase/migrations/20260914040000_meta_social_publishing.sql");
const META_GUARDS = fn("_shared/meta_guards.ts");
const META_PROTOCOL = fn("_shared/meta_publish_protocol.ts");
const META_OAUTH = fn("meta-oauth/index.ts");
const META_PUBLISH = fn("meta-publish/index.ts");
const CONFIG = path.join(root, "supabase/config.toml");
const APP = path.join(root, "src/App.tsx");
const CALLBACK = path.join(root, "src/pages/MetaOAuthCallback.tsx");
const AUTOUPLOAD = path.join(root, "src/pages/AutoUpload.tsx");
const PANEL = path.join(root, "src/components/SocialPublishPanel.tsx");

const config = read(CONFIG);
const app = read(APP);
const auto = read(AUTOUPLOAD);
const panel = read(PANEL);
const oauth = read(META_OAUTH);
const publish = read(META_PUBLISH);
const guards = read(META_GUARDS);
const protocol = read(META_PROTOCOL);
const migration = read(MIGRATION);

// ------------------------------------------------------------------ //
console.log("--- migration ---");
// ------------------------------------------------------------------ //
ok("MIGRATION_EXISTS", has(MIGRATION));
ok("MIGRATION_NO_ROW_MUTATION", !/\b(update|delete from)\s+public\.(social_accounts|publish_jobs)/i.test(migration));
ok(
  "MIGRATION_SOCIAL_ACCOUNTS_ALLOWS_ALL_FOUR",
  /social_accounts_platform_check[\s\S]{0,320}?'tiktok'[\s\S]{0,200}?'youtube'[\s\S]{0,200}?'facebook'[\s\S]{0,200}?'instagram'/i.test(migration),
);
ok(
  "MIGRATION_PUBLISH_JOBS_ALLOWS_ALL_FOUR",
  /publish_jobs_platform_check[\s\S]{0,320}?'tiktok'[\s\S]{0,200}?'youtube'[\s\S]{0,200}?'facebook'[\s\S]{0,200}?'instagram'/i.test(migration),
);
ok("MIGRATION_PRESERVES_TIKTOK_PRIVACY", /platform\s*=\s*'tiktok'[\s\S]{0,220}?PUBLIC_TO_EVERYONE[\s\S]{0,220}?SELF_ONLY/i.test(migration));
ok("MIGRATION_PRESERVES_YOUTUBE_PRIVACY", /platform\s*=\s*'youtube'[\s\S]{0,200}?'private'[\s\S]{0,120}?'unlisted'[\s\S]{0,120}?'public'/i.test(migration));
ok("MIGRATION_FACEBOOK_PUBLIC_ONLY", /platform\s*=\s*'facebook'[\s\S]{0,120}?privacy_level\s*=\s*'PUBLIC'/i.test(migration));
ok("MIGRATION_INSTAGRAM_NO_FAKE_PRIVACY", /platform\s*=\s*'instagram'[\s\S]{0,140}?PLATFORM_DEFAULT/i.test(migration));

// ------------------------------------------------------------------ //
console.log("--- shared meta modules ---");
// ------------------------------------------------------------------ //
ok("META_GUARDS_EXISTS", has(META_GUARDS));
ok("META_PROTOCOL_EXISTS", has(META_PROTOCOL));
ok("GRAPH_VERSION_PINNED", /GRAPH_VERSION\s*=\s*"v\d+\.\d+"/.test(guards + protocol));
ok("PROTOCOL_PINS_VERSION_ONCE", /export const GRAPH_VERSION\s*=/.test(protocol));
ok("SAFE_ACCOUNT_STRIPS_TOKENS", /access_token_encrypted: _\w+/.test(guards) && /refresh_token_encrypted: _\w+/.test(guards));
ok("GUARD_HAS_OWNERSHIP_CHECKS", /account_forbidden/.test(guards) && /job_forbidden/.test(guards));
ok("GUARD_HAS_APPROVAL_CHECK", /not_approved/.test(guards) && /assertApproved/.test(guards));
ok("GUARD_HAS_DUPLICATE_PROTECTION", /duplicate_publish/.test(guards));
ok("GUARD_HAS_ENTITLEMENT_CHECK", /not_entitled/.test(guards) && /social_publish/.test(guards));
ok("GUARD_SANITIZES_ERRORS", /export function sanitizeMetaError/.test(guards) && /\[redacted\]/.test(guards));
ok("GUARD_FAILS_CLOSED_NO_PAGE", /no_page/.test(guards));
ok("GUARD_FAILS_CLOSED_NO_IG_ACCOUNT", /no_ig_professional_account/.test(guards));
ok("GUARD_FAILS_CLOSED_MISSING_PERMISSIONS", /missing_permissions/.test(guards));
ok("GUARD_FAILS_CLOSED_MISSING_CREDS", /oauth_not_configured/.test(guards));

// privacy mapping
ok("FB_PRIVACY_PUBLIC_ONLY", /case "facebook"[\s\S]{0,200}?"PUBLIC"/.test(guards) || /facebook[\s\S]{0,160}?PUBLIC_ONLY/.test(guards));
ok("IG_PRIVACY_PLATFORM_DEFAULT", /PLATFORM_DEFAULT/.test(guards));
ok("PRIVACY_REJECTS_BOGUS", /return null/.test(guards));

// protocol shapes
ok("FB_START_ENDPOINT", /video_reels/.test(protocol) && /upload_phase["'\s:=]+start/.test(protocol));
ok("FB_FINISH_ENDPOINT", /upload_phase["'\s:=]+finish/.test(protocol) && /video_state["'\s:=]+PUBLISHED/.test(protocol));
ok("FB_UPLOAD_HOST_RUPLOAD", /rupload\.facebook\.com\/video-upload/.test(protocol));
ok("FB_UPLOAD_USES_FILE_URL", /file_url/.test(protocol));
ok("IG_CONTAINER_ENDPOINT", /\/media\b/.test(protocol) && /media_type/.test(protocol) && /REELS/.test(protocol));
ok("IG_USES_VIDEO_URL", /video_url/.test(protocol));
ok("IG_PUBLISH_ENDPOINT", /media_publish/.test(protocol));
ok("IG_STATUS_ENDPOINT", /status_code/.test(protocol));
ok("IG_STATUS_FINISHED_PUBLISHES", /FINISHED/.test(protocol));
ok("IG_STATUS_IN_PROGRESS_POLLS", /IN_PROGRESS/.test(protocol));
ok("IG_STATUS_ERROR_FAILS", /EXPIRED/.test(protocol) && /ERROR/.test(protocol));
ok("PROTOCOL_HAS_REQUEST_CLIENT", /export (async )?function (graphRequest|metaGraphRequest|buildGraphRequest)/.test(protocol));

// no token leakage anywhere in the new backend
const backend = guards + protocol + oauth + publish;
ok("NO_BEARER_TOKEN_LOGGING", !/console\.log\([^)]*token/i.test(backend));
ok("NO_TOKEN_IN_RESPONSE", !/json\(\s*200\s*,\s*\{[^}]*access_token[^}]*\}/i.test(oauth));

// ------------------------------------------------------------------ //
console.log("--- meta-oauth ---");
// ------------------------------------------------------------------ //
ok("META_OAUTH_EXISTS", has(META_OAUTH));
ok("META_OAUTH_JWT_ON", /\[functions\.meta-oauth\][\s\S]{0,120}?verify_jwt\s*=\s*true/.test(config));
ok("META_OAUTH_REQUIRES_USER", /auth\.getUser\(\)/.test(oauth));
ok("META_OAUTH_401_UNAUTH", /401[\s\S]{0,120}?unauthenticated/.test(oauth));
ok("META_OAUTH_STATE_BOUND_TO_USER", /social_oauth_states[\s\S]{0,240}?user_id:\s*user\.id/.test(oauth));
ok("META_OAUTH_STATE_MISMATCH_GUARD", /state_mismatch/.test(oauth) && /st\.user_id\s*!==\s*user\.id/.test(oauth));
ok("META_OAUTH_PKCE", /code_challenge/.test(oauth) && /S256/.test(oauth) && /code_verifier/.test(oauth));
// scope vocabulary is declared once in meta_guards and consumed by meta-oauth
const metaBackend = guards + oauth;
ok("META_OAUTH_SCOPES_FACEBOOK", /pages_show_list/.test(metaBackend) && /pages_read_engagement/.test(metaBackend) && /pages_manage_posts/.test(metaBackend));
ok("META_OAUTH_SCOPES_INSTAGRAM", /instagram_basic/.test(metaBackend) && /instagram_content_publish/.test(metaBackend));
ok("META_OAUTH_DISCOVERS_PAGES", /\/me\/accounts/.test(oauth));
ok("META_OAUTH_DISCOVERS_IG", /instagram_business_account/.test(oauth));
ok("META_OAUTH_ENCRYPTS_TOKENS", /encryptToken\(/.test(oauth) && /loadKeyFromEnv/.test(oauth));
ok("META_OAUTH_PLATFORM_FACEBOOK_ROW", /platform:\s*"facebook"/.test(oauth));
ok("META_OAUTH_PLATFORM_INSTAGRAM_ROW", /platform:\s*"instagram"/.test(oauth));
ok("META_OAUTH_NO_TOKEN_TO_BROWSER", /safeAccount\(/.test(oauth));
ok("META_OAUTH_FB_LOGIN_HOST", /facebook\.com\/v\d+\.\d+\/dialog\/oauth/.test(metaBackend));
ok("META_OAUTH_GRAPH_TOKEN_EXCHANGE", /oauth\/access_token/.test(oauth));

// ------------------------------------------------------------------ //
console.log("--- meta-publish ---");
// ------------------------------------------------------------------ //
ok("META_PUBLISH_EXISTS", has(META_PUBLISH));
ok("META_PUBLISH_JWT_ON", /\[functions\.meta-publish\][\s\S]{0,120}?verify_jwt\s*=\s*true/.test(config));
ok("META_PUBLISH_REQUIRES_USER", /auth\.getUser\(\)/.test(publish));
ok("META_PUBLISH_ENTITLEMENT_RPC", /rpc\(\s*"account_entitlements"/.test(publish));
ok("META_PUBLISH_OWNERSHIP_JOB", /jobs_new/.test(publish) && /job_forbidden/.test(publish));
ok("META_PUBLISH_OWNERSHIP_ACCOUNT", /social_accounts/.test(publish) && /account_forbidden/.test(publish));
ok("META_PUBLISH_DUPLICATE_GUARD", /duplicate_publish/.test(publish) && /23505/.test(publish));
ok("META_PUBLISH_APPROVAL_REQUIRED", /assertApproved/.test(publish) && /not_approved/.test(publish));
ok("META_PUBLISH_INSERTS_JOB", /from\("publish_jobs"\)[\s\S]{0,400}?insert\(/.test(publish));
ok("META_PUBLISH_DECRYPTS_TOKEN", /decryptToken\(/.test(publish));
ok("META_PUBLISH_SANITIZED_ERRORS", /sanitizeMetaError/.test(publish));
ok("META_PUBLISH_PERSISTS_STATUS", /publish_status/.test(publish));
ok("META_PUBLISH_FB_PATH", /facebook/i.test(publish) && /video_reels|facebookReel/i.test(publish + protocol));
ok("META_PUBLISH_IG_PATH", /instagram/i.test(publish) && /media_publish|instagramReel/i.test(publish + protocol));
ok("META_PUBLISH_IG_PERSISTS_PERMALINK", /permalink/.test(publish + protocol));
// guard ORDER: entitlement before approval before duplicate
const order = [
  ['rpc("account_entitlements"', "entitlement"],
  ["assertApproved", "approval"],
];
// anchor on CALL SITES — the bare identifiers also appear in the import list
const ENT_AT = publish.indexOf('rpc("account_entitlements"');
const APPROVE_AT = publish.indexOf("assertApproved(approvalStatus)");
ok("META_PUBLISH_ORDER_ENTITLEMENT_FIRST", ENT_AT >= 0 && APPROVE_AT > 0 && ENT_AT < APPROVE_AT);
// anchor on the INSERT, not the earlier duplicate-guard SELECT
const INSERT_AT = publish.indexOf('.from("publish_jobs").insert(');
ok("META_PUBLISH_ORDER_APPROVAL_BEFORE_INSERT", INSERT_AT > 0 && APPROVE_AT > 0 && APPROVE_AT < INSERT_AT);
ok("META_PUBLISH_ORDER_DECRYPT_AFTER_INSERT", INSERT_AT > 0 && publish.indexOf("await decryptToken(") > INSERT_AT);
// NO WORKER
ok("META_NO_WORKER_HANDOFF", !/AI_WORKER_URL|AI_WORKER_API_KEY|ai-worker/i.test(oauth + publish + protocol));
ok("META_NO_WORKER_OVERLAY", !/social\/youtube-upload|workerUrl/.test(publish));

// ------------------------------------------------------------------ //
console.log("--- UI ---");
// ------------------------------------------------------------------ //
ok("CALLBACK_PAGE_EXISTS", has(CALLBACK));
ok("ROUTE_META_OAUTH", /path="\/meta-oauth"/.test(app));
ok("AUTOUPLOAD_FACEBOOK_ROW", /Facebook/.test(auto));
ok("AUTOUPLOAD_INSTAGRAM_ROW", /Instagram/.test(auto));
ok("AUTOUPLOAD_CONNECT_META", /meta-oauth/.test(auto));
ok("AUTOUPLOAD_NO_FAKE_CONNECTED", /connected:\s*false/.test(auto) && /rows\.find/.test(auto));
ok("PANEL_TAB_FACEBOOK", /"facebook"/.test(panel));
ok("PANEL_TAB_INSTAGRAM", /"instagram"/.test(panel));
ok("PANEL_FB_NO_PRIVACY_CHOOSER", !/FACEBOOK_PRIVACY/.test(panel));
ok("PANEL_HAS_APPROVE_PUBLISH", /APPROVE & PUBLISH/.test(panel));
ok("PANEL_IG_DEFAULT_AUDIENCE_NOTE", /default audience|no per-post privacy/i.test(panel));

// ------------------------------------------------------------------ //
console.log("--- regression / scope ---");
// ------------------------------------------------------------------ //
let changed = [];
try {
  changed = execSync("git diff --name-only HEAD", { cwd: root }).toString().trim().split("\n").filter(Boolean);
} catch {
  changed = [];
}
// Files already dirty before this build (earlier phases) — not ours.
const PREEXISTING_DIRTY = [
  "ai-worker/Dockerfile",
  "ai-worker/requirements.txt",
  "supabase/functions/ai-worker-proxy/index.ts",
];
const ours = changed.filter((f) => !PREEXISTING_DIRTY.includes(f));
ok("TIKTOK_UNCHANGED", !ours.some((f) => /tiktok/i.test(f)));
ok("YOUTUBE_UNCHANGED", !ours.some((f) => /youtube/i.test(f)));
ok("GATE77_UNCHANGED", !ours.some((f) => /job-processor|renderer\.py|create-job|ai-worker/.test(f)));
ok("CAPTIONS_UNCHANGED", !ours.some((f) => /renderer\.py|caption/i.test(f)));
// This build legitimately touches these non-"meta"-named files; anything else is scope creep.
const ALLOWED_NON_META = [
  "supabase/config.toml",
  "src/App.tsx",
  "src/pages/AutoUpload.tsx",
  "src/components/SocialPublishPanel.tsx",
];
const outOfScope = ours.filter((f) => !/meta/i.test(f) && !ALLOWED_NON_META.includes(f));
ok("ONLY_META_FILES_TOUCHED", outOfScope.length === 0, outOfScope.join(","));
ok("NO_TIKTOK_FILES_EXIST_UNMODIFIED", has(fn("tiktok-oauth/index.ts")) && has(fn("tiktok-publish/index.ts")));

console.log(`\nTEST_RESULTS=${fail === 0 ? "ALL_PASS" : "FAIL"} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
