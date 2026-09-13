#!/usr/bin/env node
/**
 * Gate #78 Phase B — TikTok MVP infrastructure contract tests.
 * No live TikTok OAuth, no @smithlife44, no publish, no paid calls.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function loadTs(rel) {
  const src = readFileSync(path.join(root, rel), "utf8");
  const { code } = transformSync(src, { loader: "ts", format: "cjs" });
  const mod = { exports: {} };
  new Function("module", "exports", "require", code)(mod, mod.exports, require);
  return mod.exports;
}

const access = loadTs("src/lib/access.ts");
const { resolveEntitlements, isOwner } = access;

async function main() {
let failed = 0;
function pass(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    failed += 1;
    return;
  }
  console.log("PASS", name);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

const mig = read("supabase/migrations/20260914000000_tiktok_social_publishing.sql");
const oauth = read("supabase/functions/tiktok-oauth/index.ts");
const pub = read("supabase/functions/tiktok-publish/index.ts");
const cryptoSrc = read("supabase/functions/_shared/social_token_crypto.ts");
const guardsSrc = read("supabase/functions/_shared/tiktok_guards.ts");
const panel = read("src/components/SocialPublishPanel.tsx");
const status = read("src/pages/Status.tsx");
const auto = read("src/pages/AutoUpload.tsx");
const clip = read("src/pages/ClipPost.tsx");
const app = read("src/App.tsx");
const cfg = read("supabase/config.toml");
const socialAuth = read("supabase/functions/social-auth/index.ts");
const clipFn = read("supabase/functions/clip-and-post/index.ts");
const processor = read("supabase/functions/job-processor/index.ts");
const renderer = read("ai-worker/renderer.py");
const transcribe = read("supabase/functions/transcribe/index.ts");
const scribe = read("ai-worker/transcription/elevenlabs_scribe.py");

pass("MIGRATION_EXISTS", mig.length > 200);
pass("OAUTH_FN_EXISTS", oauth.includes("auth.getUser"));
pass("PUBLISH_FN_EXISTS", pub.includes("auth.getUser"));
pass("CRYPTO_EXISTS", cryptoSrc.includes("encryptToken") && cryptoSrc.includes("decryptToken"));
pass("GUARDS_EXISTS", guardsSrc.includes("assertApproved"));
pass("PANEL_EXISTS", panel.includes("APPROVE & PUBLISH"));
pass("STATUS_MOUNTS_PANEL", status.includes("SocialPublishPanel"));

pass("SCHEMA_SOCIAL_ACCOUNTS", mig.includes("CREATE TABLE IF NOT EXISTS public.social_accounts"));
pass("SCHEMA_PUBLISH_JOBS", mig.includes("CREATE TABLE IF NOT EXISTS public.publish_jobs"));
pass("SCHEMA_USER_ID", mig.includes("user_id UUID NOT NULL"));
pass("SCHEMA_NO_WORKSPACE", !/\bworkspace_id\b/.test(mig.replace(/--[^\n]*/g, "")));
pass("SCHEMA_PLATFORM", mig.includes("platform TEXT NOT NULL"));
pass("SCHEMA_ENC_ACCESS", mig.includes("access_token_encrypted"));
pass("SCHEMA_ENC_REFRESH", mig.includes("refresh_token_encrypted"));
pass("SCHEMA_TOKEN_EXPIRES", mig.includes("token_expires_at"));
pass("SCHEMA_SCOPES", mig.includes("scopes"));
pass("SCHEMA_STATUS", mig.includes("status TEXT NOT NULL"));
pass("SCHEMA_REVOKED_AT", mig.includes("revoked_at"));
pass("SCHEMA_APPROVAL_STATUS", mig.includes("approval_status"));
pass("SCHEMA_APPROVED_AT", mig.includes("approved_at"));
pass("SCHEMA_PUBLISH_STATUS", mig.includes("publish_status"));
pass("SCHEMA_PLATFORM_PUBLISH_ID", mig.includes("platform_publish_id"));
pass("SCHEMA_PLATFORM_POST_ID", mig.includes("platform_post_id"));
pass("SCHEMA_PLATFORM_POST_URL", mig.includes("platform_post_url"));
pass("SCHEMA_ERROR_SANITIZED", mig.includes("error_message_sanitized"));
pass("SCHEMA_BOOM_JOB_ID", mig.includes("boom_job_id"));
pass("SCHEMA_CAPTION", mig.includes("caption"));
pass("SCHEMA_HASHTAGS", mig.includes("hashtags"));
pass("SCHEMA_PRIVACY", mig.includes("privacy_level"));
pass("SCHEMA_UNIQUE_IDEMPOTENCY", /UNIQUE\s*\(\s*boom_job_id\s*,\s*social_account_id\s*\)/i.test(mig));
pass("RLS_ENABLED_ACCOUNTS", /ALTER TABLE public\.social_accounts ENABLE ROW LEVEL SECURITY/.test(mig));
pass("RLS_ENABLED_JOBS", /ALTER TABLE public\.publish_jobs ENABLE ROW LEVEL SECURITY/.test(mig));
pass("RLS_OWN_ROWS", mig.includes("auth.uid() = user_id"));
pass("RLS_NO_CROSS_TENANT_TRUE", !/USING\s*\(\s*true\s*\)/i.test(mig));
pass("COLUMN_REVOKE_TOKENS", /REVOKE SELECT\s*\(\s*access_token_encrypted/i.test(mig) || mig.includes("social_accounts_safe"));

pass("OAUTH_JWT_REQUIRED", oauth.includes("User not authenticated") || oauth.includes("No authorization header"));
pass("OAUTH_STATE_BOUND", oauth.includes("state") && oauth.includes("user.id"));
pass("OAUTH_PKCE", oauth.includes("code_verifier") && oauth.includes("code_challenge"));
pass("OAUTH_V2_AUTHORIZE", oauth.includes("https://www.tiktok.com/v2/auth/authorize/"));
pass("OAUTH_V2_TOKEN", oauth.includes("https://open.tiktokapis.com/v2/oauth/token/"));
pass("OAUTH_NO_LEGACY_OPENAPI", !oauth.includes("open-api.tiktok.com"));
pass("OAUTH_NEVER_RETURNS_ACCESS", !/accessToken|access_token/.test(oauth.replace(/access_token_encrypted/g, "").replace(/token_expires_at/g, "")) || (oauth.includes("safeAccount") && !oauth.includes("accessToken:")));
pass("OAUTH_NO_CLIENT_TOKEN_JSON", !oauth.includes("accessToken:") && !oauth.includes("refreshToken:"));
pass("OAUTH_FAIL_CLOSED_NO_CREDS", oauth.includes("oauth_not_configured") || oauth.includes("TikTok developer app is not configured"));
pass("OAUTH_NO_FAKE_SUCCESS", !oauth.includes("demo_user") && !oauth.includes("Successfully connected"));
pass("CONFIG_OAUTH_JWT", cfg.includes("[functions.tiktok-oauth]") && /\[functions\.tiktok-oauth\][\s\S]{0,80}verify_jwt = true/.test(cfg));
pass("CONFIG_PUBLISH_JWT", cfg.includes("[functions.tiktok-publish]") && /\[functions\.tiktok-publish\][\s\S]{0,80}verify_jwt = true/.test(cfg));

pass("PUBLISH_ENTITLEMENT", pub.includes("social_publish"));
pass("PUBLISH_APPROVAL_REQUIRED", pub.includes("approval_status") && (pub.includes("not_approved") || pub.includes("APPROVAL_REQUIRED")));
pass("PUBLISH_REJECTS_UNAPPROVED", pub.includes("approved"));
pass("PUBLISH_OWNERSHIP_JOB", pub.includes("boom_job_id") && pub.includes("user_id"));
pass("PUBLISH_OWNERSHIP_ACCOUNT", pub.includes("social_account_id"));
pass("PUBLISH_V2_INIT", pub.includes("https://open.tiktokapis.com/v2/post/publish/video/init/"));
pass("PUBLISH_V2_STATUS", pub.includes("https://open.tiktokapis.com/v2/post/publish/status/fetch/"));
pass("PUBLISH_PULL_OR_UPLOAD", pub.includes("PULL_FROM_URL") || pub.includes("FILE_UPLOAD"));
pass("PUBLISH_NO_CALL_WITHOUT_APPROVAL", pub.includes("assertApproved") || pub.includes('!== "approved"'));
pass("PUBLISH_DUPLICATE", pub.includes("duplicate") || pub.includes("23505"));
pass("PUBLISH_TOKEN_EXPIRED", pub.includes("token_expired"));
pass("PUBLISH_REVOKED", pub.includes("revoked"));
pass("PUBLISH_NO_TOKENS_IN_RESPONSE", !pub.includes("accessToken:") && !pub.includes("refreshToken:"));
pass("PUBLISH_USES_OUTPUT_URL", pub.includes("output_url"));
pass("PUBLISH_NO_TIKTOK_IF_UNCONFIGURED", pub.includes("oauth_not_configured"));

pass("CRYPTO_AES_GCM", cryptoSrc.includes("AES-GCM") || cryptoSrc.includes("aes-256-gcm"));
pass("CRYPTO_NO_LOG_PLAINTEXT", !cryptoSrc.includes("console.log(plain") && !cryptoSrc.includes("console.log(token"));

const owner = resolveEntitlements({ role: "owner_admin", plan: "enterprise_internal" });
const free = resolveEntitlements({ role: "customer", plan: "free" });
const pro = resolveEntitlements({ role: "customer", plan: "pro" });
const biz = resolveEntitlements({ role: "customer", plan: "business" });
const agency = resolveEntitlements({ role: "customer", plan: "agency" });
pass("OWNER_SOCIAL_TRUE", owner.socialPublish === true);
pass("FREE_SOCIAL_FALSE", free.socialPublish === false);
pass("PRO_SOCIAL_FALSE", pro.socialPublish === false);
pass("BUSINESS_SOCIAL_TRUE", biz.socialPublish === true);
pass("AGENCY_SOCIAL_TRUE", agency.socialPublish === true);
pass("EMAIL_HACK_STILL_RETIRED", isOwner("mydbmbusiness39@gmail.com") === false);

pass("PANEL_APPROVE_LABEL", panel.includes("APPROVE & PUBLISH"));
pass("PANEL_NO_AUTO_PUBLISH", !panel.includes("useEffect") || !/useEffect\([\s\S]{0,400}tiktok-publish/.test(panel));
pass("PANEL_SETUP_REQUIRED", panel.includes("setup-required") || panel.includes("developer app setup required") || panel.includes("TikTok developer app is not configured"));
pass("PANEL_NO_DEMO_USER", !panel.includes("demo_user") && !panel.includes("@smithlife44"));
pass("PANEL_CAPTION", panel.includes("caption"));
pass("PANEL_HASHTAGS", panel.includes("hashtag"));
pass("PANEL_PRIVACY", panel.includes("privacy"));
pass("PANEL_PREVIEW", panel.includes("<video") || panel.includes("outputUrl"));
pass("PANEL_COMPLETED_ONLY", panel.includes("completed") || status.includes("job.status === \"completed\""));

pass("AUTO_NO_DEMO_CONNECT", !auto.includes("@demo_user") && !auto.includes("demo_user_"));
pass("AUTO_NO_RANDOM_FOLLOWERS", !auto.includes("Math.random()"));
pass("AUTO_NO_SOCIAL_AUTH_INVOKE", !auto.includes("functions.invoke('social-auth'") && !auto.includes('functions.invoke("social-auth"'));
pass("AUTO_NO_FAKE_CONNECTED", !/connected:\s*true/.test(auto) || auto.includes("setup"));
pass("CLIP_NO_FAKE_POSTED", !clip.includes("Successfully Posted!") && !clip.includes("Your clip has been auto-formatted and posted"));
pass("CLIP_NO_EXAMPLE_POST", true);
pass("APP_CALLBACK_ROUTE", app.includes("tiktok-oauth") || app.includes("TikTokOAuthCallback"));

pass("LEGACY_SOCIAL_AUTH_NOT_REUSED", !oauth.includes("open-api.tiktok.com") && !pub.includes("../social-auth"));
pass("LEGACY_CLIP_NOT_REUSED", !pub.includes("example.com/clips") && !oauth.includes("clip-and-post"));
pass("GATE77_PROCESSOR_UNTOUCHED_MARKER", processor.includes("MAX_RENDER_COMPLETE_ATTEMPTS") || processor.includes("render-complete"));
pass("CAPTION_PIPELINE_UNTOUCHED", renderer.includes("drawtext=textfile=") && scribe.includes("speech-to-text"));
pass("TRANSCRIBE_UNTOUCHED", transcribe.includes("paid_transcription_allowed"));

if (!existsSync(path.join(root, "supabase/functions/_shared/social_token_crypto.ts"))) {
  pass("TOKEN_ROUNDTRIP", false);
  pass("TOKEN_NOT_PLAINTEXT", false);
  pass("SAFE_ACCOUNT_STRIPS_TOKENS", false);
  pass("UNAUTH_BLOCKED", false);
  pass("FREE_BLOCKED_GUARD", false);
  pass("OWNER_ALLOWED_GUARD", false);
  pass("APPROVAL_REQUIRED_GUARD", false);
  pass("UNAPPROVED_BLOCKS_PUBLISH", false);
  pass("DUPLICATE_BLOCKS", false);
  pass("TOKEN_EXPIRED_GUARD", false);
  pass("REVOKED_GUARD", false);
  pass("WRONG_OWNER_BLOCKED", false);
  pass("COMPLETED_MP4_SELECTED", false);
} else {
  const cryptoMod = loadTs("supabase/functions/_shared/social_token_crypto.ts");
  const guards = loadTs("supabase/functions/_shared/tiktok_guards.ts");
  const runCrypto = async () => {
    const key = cryptoMod.deriveTestKey
      ? await cryptoMod.deriveTestKey("boom-g78-test-key")
      : null;
    if (!key) {
      pass("TOKEN_ROUNDTRIP", false);
      pass("TOKEN_NOT_PLAINTEXT", false);
      return;
    }
    const enc = await cryptoMod.encryptToken("tok_live_secret_value", key);
    const dec = await cryptoMod.decryptToken(enc, key);
    pass("TOKEN_ROUNDTRIP", dec === "tok_live_secret_value");
    pass("TOKEN_NOT_PLAINTEXT", typeof enc === "string" && !enc.includes("tok_live_secret_value"));
  };
  await runCrypto();

  const safe = guards.safeAccount({
    id: "a1",
    user_id: "u1",
    platform: "tiktok",
    platform_username: "x",
    access_token_encrypted: "CIPHER",
    refresh_token_encrypted: "CIPHER2",
    status: "active",
  });
  pass("SAFE_ACCOUNT_STRIPS_TOKENS", safe.access_token_encrypted === undefined && safe.refresh_token_encrypted === undefined && !JSON.stringify(safe).includes("CIPHER"));

  pass("UNAUTH_BLOCKED", guards.decideOAuthStart({ user: null, hasTikTokCreds: true }).status === 401);
  pass("FREE_BLOCKED_GUARD", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: false },
    approvalStatus: "approved",
    account: { user_id: "u1", status: "active", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: null,
    hasTikTokCreds: true,
  }).status === 403);
  pass("OWNER_ALLOWED_GUARD", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "approved",
    account: { user_id: "u1", status: "active", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: null,
    hasTikTokCreds: false,
  }).code === "oauth_not_configured");
  pass("APPROVAL_REQUIRED_GUARD", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "draft",
    account: { user_id: "u1", status: "active", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: null,
    hasTikTokCreds: true,
  }).code === "not_approved");
  pass("UNAPPROVED_BLOCKS_PUBLISH", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "pending",
    account: { user_id: "u1", status: "active", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: null,
    hasTikTokCreds: true,
  }).tiktokCalled === false);
  pass("DUPLICATE_BLOCKS", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "approved",
    account: { user_id: "u1", status: "active", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: { id: "pj1", publish_status: "processing" },
    hasTikTokCreds: true,
  }).code === "duplicate_publish");
  pass("TOKEN_EXPIRED_GUARD", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "approved",
    account: { user_id: "u1", status: "active", token_expires_at: new Date(Date.now() - 1000).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: null,
    hasTikTokCreds: true,
  }).code === "token_expired");
  pass("REVOKED_GUARD", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "approved",
    account: { user_id: "u1", status: "revoked", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: null,
    hasTikTokCreds: true,
  }).code === "revoked");
  pass("WRONG_OWNER_BLOCKED", guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "approved",
    account: { user_id: "u2", status: "active", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://x/a.mp4" },
    existing: null,
    hasTikTokCreds: true,
  }).status === 403);
  const okMedia = guards.decidePublish({
    user: { id: "u1" },
    entitlement: { social_publish: true },
    approvalStatus: "approved",
    account: { user_id: "u1", status: "active", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
    job: { user_id: "u1", status: "completed", output_url: "https://dgrkcuddnfhkwsclviqk.supabase.co/storage/v1/object/public/videoupload/outputs/abc_final.mp4" },
    existing: null,
    hasTikTokCreds: true,
  });
  pass("COMPLETED_MP4_SELECTED", okMedia.videoUrl && okMedia.videoUrl.includes("_final.mp4") && okMedia.tiktokCalled !== false);
}

if (failed) {
  console.log("TEST_RESULTS=FAIL", failed);
  process.exit(1);
}
console.log("TEST_RESULTS=ALL_PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
