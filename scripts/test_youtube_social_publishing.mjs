#!/usr/bin/env node
/**
 * Gate #78 YouTube Shorts MVP contract tests.
 * No live Google OAuth, no owner YouTube connect, no publish, no paid calls.
 * Must not mutate TikTok / Gate #77 / caption pipelines.
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

  const mig = read("supabase/migrations/20260914010000_youtube_social_publishing.sql");
  const tiktokMig = read("supabase/migrations/20260914000000_tiktok_social_publishing.sql");
  const oauth = read("supabase/functions/youtube-oauth/index.ts");
  const pub = read("supabase/functions/youtube-publish/index.ts");
  const cryptoSrc = read("supabase/functions/_shared/social_token_crypto.ts");
  const ytGuards = read("supabase/functions/_shared/youtube_guards.ts");
  const ytProto = read("supabase/functions/_shared/youtube_upload_protocol.ts");
  const workerPy = read("ai-worker/youtube_upload.py");
  const workerMain = read("ai-worker/main.py");
  const panel = read("src/components/SocialPublishPanel.tsx");
  const status = read("src/pages/Status.tsx");
  const auto = read("src/pages/AutoUpload.tsx");
  const app = read("src/App.tsx");
  const cfg = read("supabase/config.toml");
  const socialAuth = read("supabase/functions/social-auth/index.ts");
  const clipFn = read("supabase/functions/clip-and-post/index.ts");
  const tiktokOauth = read("supabase/functions/tiktok-oauth/index.ts");
  const tiktokPub = read("supabase/functions/tiktok-publish/index.ts");
  const processor = read("supabase/functions/job-processor/index.ts");
  const renderer = read("ai-worker/renderer.py");
  const transcribe = read("supabase/functions/transcribe/index.ts");
  const scribe = read("ai-worker/transcription/elevenlabs_scribe.py");
  const callback = read("src/pages/YouTubeOAuthCallback.tsx");

  pass("YT_MIGRATION_EXISTS", mig.length > 200);
  pass("YT_OAUTH_FN_EXISTS", oauth.includes("auth.getUser"));
  pass("YT_PUBLISH_FN_EXISTS", pub.includes("auth.getUser"));
  pass("YT_GUARDS_EXISTS", ytGuards.includes("assertApproved") && ytGuards.includes("decideYouTubePublish"));
  pass("YT_PROTOCOL_EXISTS", ytProto.includes("videos.insert") || ytProto.includes("uploadType=resumable"));
  pass("YT_WORKER_MODULE_EXISTS", workerPy.includes("resumable") && workerPy.includes("videos"));
  pass("YT_WORKER_ROUTE", workerMain.includes("/social/youtube-upload") && workerMain.includes("youtube_upload"));
  pass("YT_CALLBACK_PAGE", callback.includes("youtube-oauth") && callback.includes("youtube-oauth"));
  pass("APP_YOUTUBE_CALLBACK_ROUTE", app.includes("/youtube-oauth") && app.includes("YouTubeOAuthCallback"));

  pass("SCHEMA_EXTENDS_ACCOUNTS_YOUTUBE", /platform IN \([^)]*'youtube'/.test(mig) || mig.includes("'tiktok', 'youtube'"));
  pass("SCHEMA_EXTENDS_JOBS_YOUTUBE", mig.includes("publish_jobs") && (mig.includes("'youtube'") || mig.includes("youtube")));
  pass("SCHEMA_KEEPS_TIKTOK", mig.includes("tiktok") && tiktokMig.includes("CHECK (platform IN ('tiktok'))"));
  pass("SCHEMA_NO_DROP_ACCOUNTS", !/DROP TABLE\s+public\.social_accounts/i.test(mig));
  pass("SCHEMA_NO_DROP_JOBS", !/DROP TABLE\s+public\.publish_jobs/i.test(mig));
  pass("SCHEMA_NO_WORKSPACE", !/\bworkspace_id\b/.test(mig.replace(/--[^\n]*/g, "")));
  pass("SCHEMA_YT_PRIVACY", mig.includes("private") && mig.includes("unlisted") && mig.includes("public"));
  pass("SCHEMA_TIKTOK_PRIVACY_KEPT", mig.includes("SELF_ONLY") || tiktokMig.includes("SELF_ONLY"));
  pass("SCHEMA_UPLOADING_STATUS", mig.includes("uploading"));
  pass("SCHEMA_DESCRIPTION", mig.includes("description"));
  pass("SCHEMA_UNIQUE_KEPT", tiktokMig.includes("UNIQUE (boom_job_id, social_account_id)"));
  pass("RLS_NOT_DISABLED", !/DISABLE ROW LEVEL SECURITY/i.test(mig));

  pass("OAUTH_JWT_REQUIRED", oauth.includes("User not authenticated") || oauth.includes("No authorization header"));
  pass("OAUTH_STATE_BOUND", oauth.includes("state") && oauth.includes("user.id"));
  pass("OAUTH_PKCE", oauth.includes("code_verifier") && oauth.includes("code_challenge"));
  pass("OAUTH_GOOGLE_AUTHORIZE", oauth.includes("https://accounts.google.com/o/oauth2/v2/auth"));
  pass("OAUTH_GOOGLE_TOKEN", oauth.includes("https://oauth2.googleapis.com/token"));
  pass("OAUTH_UPLOAD_SCOPE", oauth.includes("https://www.googleapis.com/auth/youtube.upload"));
  pass("OAUTH_ACCESS_TYPE_OFFLINE", oauth.includes("access_type") && oauth.includes("offline"));
  pass("OAUTH_PROMPT_CONSENT", oauth.includes("prompt") && oauth.includes("consent"));
  pass("OAUTH_NEVER_RETURNS_ACCESS", !oauth.includes("accessToken:") && !oauth.includes("refreshToken:"));
  pass("OAUTH_ENCRYPTS", oauth.includes("encryptToken"));
  pass("OAUTH_FAIL_CLOSED_NO_CREDS", oauth.includes("oauth_not_configured"));
  pass("OAUTH_NO_FAKE_SUCCESS", !oauth.includes("demo_user") && !oauth.includes("Successfully connected"));
  pass("OAUTH_REDIRECT_PRODUCTION", oauth.includes("/youtube-oauth"));
  pass("OAUTH_PLATFORM_YOUTUBE", oauth.includes('platform: "youtube"') || oauth.includes("platform: 'youtube'"));
  pass("CONFIG_YT_OAUTH_JWT", cfg.includes("[functions.youtube-oauth]") && /\[functions\.youtube-oauth\][\s\S]{0,80}verify_jwt = true/.test(cfg));
  pass("CONFIG_YT_PUBLISH_JWT", cfg.includes("[functions.youtube-publish]") && /\[functions\.youtube-publish\][\s\S]{0,80}verify_jwt = true/.test(cfg));

  pass("PUBLISH_ENTITLEMENT", pub.includes("social_publish"));
  pass("PUBLISH_APPROVAL_REQUIRED", pub.includes("not_approved") || pub.includes("APPROVAL_REQUIRED"));
  pass("PUBLISH_OWNERSHIP", pub.includes("boom_job_id") && pub.includes("social_account_id"));
  pass("PUBLISH_RESUMABLE", pub.includes("uploadType=resumable") || pub.includes("/social/youtube-upload"));
  pass("PUBLISH_NO_EDGE_BYTE_STREAM", !pub.includes("file.arrayBuffer") && !pub.includes("new Uint8Array(await"));
  pass("PUBLISH_DUPLICATE", pub.includes("duplicate") || pub.includes("23505"));
  pass("PUBLISH_TOKEN_EXPIRED", pub.includes("token_expired"));
  pass("PUBLISH_REVOKED", pub.includes("revoked"));
  pass("PUBLISH_NO_TOKENS_IN_RESPONSE", !pub.includes("accessToken:") && !pub.includes("refreshToken:"));
  pass("PUBLISH_USES_OUTPUT_URL", pub.includes("output_url"));
  pass("PUBLISH_TITLE_DESC_PRIVACY", pub.includes("title") && (pub.includes("description") || pub.includes("caption")) && pub.includes("privacy"));
  pass("PUBLISH_FAIL_CLOSED_NO_CREDS", pub.includes("oauth_not_configured"));
  pass("PUBLISH_NO_LEGACY", !pub.includes("social-auth") && !pub.includes("clip-and-post"));
  pass("PUBLISH_WORKER_HANDOFF", pub.includes("/social/youtube-upload") || pub.includes("youtube_upload"));

  pass("CRYPTO_REUSED", cryptoSrc.includes("encryptToken") && oauth.includes("social_token_crypto"));
  pass("LEGACY_SOCIAL_AUTH_STILL_410", socialAuth.includes("410") || socialAuth.includes("disabled"));
  pass("LEGACY_CLIP_STILL_DISABLED", clipFn.includes("disabled") || clipFn.includes("410"));
  pass("TIKTOK_OAUTH_UNCHANGED_V2", tiktokOauth.includes("https://www.tiktok.com/v2/auth/authorize/"));
  pass("TIKTOK_PUBLISH_UNCHANGED_V2", tiktokPub.includes("https://open.tiktokapis.com/v2/post/publish/video/init/"));
  pass("GATE77_PROCESSOR_UNTOUCHED", processor.includes("MAX_RENDER_COMPLETE_ATTEMPTS") || processor.includes("render-complete"));
  pass("CAPTION_PIPELINE_UNTOUCHED", renderer.includes("drawtext=textfile=") && scribe.includes("speech-to-text"));
  pass("TRANSCRIBE_UNTOUCHED", transcribe.includes("paid_transcription_allowed"));

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

  pass("PANEL_YOUTUBE_TAB", panel.includes("YouTube") && panel.includes("TikTok"));
  pass("PANEL_YT_TITLE", panel.includes("youtube-title") || /htmlFor=["']youtube-title["']/.test(panel));
  pass("PANEL_YT_DESCRIPTION", panel.includes("youtube-description") || /htmlFor=["']youtube-description["']/.test(panel));
  pass("PANEL_YT_PRIVACY", panel.includes("private") && panel.includes("unlisted") && panel.includes("public"));
  pass("PANEL_APPROVE_LABEL", panel.includes("APPROVE & PUBLISH"));
  pass("PANEL_YT_SETUP_REQUIRED", panel.includes("youtube-setup-required") || panel.includes("Google Cloud OAuth is not configured") || panel.includes("YouTube developer app is not configured"));
  pass("PANEL_NO_FAKE_YT_SUCCESS", !panel.includes("Successfully Posted") && !panel.includes("@demo_user"));
  pass("PANEL_NO_AUTO_YT_PUBLISH", !/useEffect\([\s\S]{0,400}youtube-publish/.test(panel));
  pass("STATUS_MOUNTS_PANEL", status.includes("SocialPublishPanel"));
  pass("AUTO_YT_NOT_FAKE", !auto.includes("@demo_user"));

  if (!existsSync(path.join(root, "supabase/functions/_shared/youtube_guards.ts"))) {
    [
      "TOKEN_ROUNDTRIP",
      "SAFE_ACCOUNT_STRIPS_TOKENS",
      "UNAUTH_BLOCKED",
      "FREE_BLOCKED_GUARD",
      "OWNER_ALLOWED_GUARD",
      "APPROVAL_REQUIRED_GUARD",
      "UNAPPROVED_BLOCKS_PUBLISH",
      "DUPLICATE_BLOCKS",
      "TOKEN_EXPIRED_GUARD",
      "REVOKED_GUARD",
      "WRONG_OWNER_BLOCKED",
      "COMPLETED_MP4_SELECTED",
      "YT_PRIVACY_PRIVATE",
      "YT_PRIVACY_UNLISTED",
      "YT_PRIVACY_PUBLIC",
      "YT_PRIVACY_REJECTS_TIKTOK_ENUM",
      "RESUMABLE_INIT_SHAPE",
      "RESUMABLE_INIT_URL",
      "CHUNK_PUT_USES_SESSION",
      "FINALIZE_READS_VIDEO_ID",
      "REFRESH_TOKEN_GRANT",
    ].forEach((n) => pass(n, false));
  } else {
    const cryptoMod = loadTs("supabase/functions/_shared/social_token_crypto.ts");
    const guards = loadTs("supabase/functions/_shared/youtube_guards.ts");
    const proto = loadTs("supabase/functions/_shared/youtube_upload_protocol.ts");

    const key = await cryptoMod.deriveTestKey("boom-g78-yt-test-key");
    const enc = await cryptoMod.encryptToken("yt_live_secret_value", key);
    const dec = await cryptoMod.decryptToken(enc, key);
    pass("TOKEN_ROUNDTRIP", dec === "yt_live_secret_value");
    pass("TOKEN_NOT_PLAINTEXT", typeof enc === "string" && !enc.includes("yt_live_secret_value"));

    const safe = guards.safeAccount({
      id: "a1",
      user_id: "u1",
      platform: "youtube",
      platform_username: "chan",
      access_token_encrypted: "CIPHER",
      refresh_token_encrypted: "CIPHER2",
      status: "active",
    });
    pass(
      "SAFE_ACCOUNT_STRIPS_TOKENS",
      safe.access_token_encrypted === undefined &&
        safe.refresh_token_encrypted === undefined &&
        !JSON.stringify(safe).includes("CIPHER")
    );

    pass("UNAUTH_BLOCKED", guards.decideYouTubeOAuthStart({ user: null, hasGoogleCreds: true }).status === 401);
    pass(
      "FREE_BLOCKED_GUARD",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: false },
        approvalStatus: "approved",
        account: { user_id: "u1", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: true,
      }).status === 403
    );
    pass(
      "OWNER_ALLOWED_GUARD",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "approved",
        account: { user_id: "u1", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: false,
      }).code === "oauth_not_configured"
    );
    pass(
      "APPROVAL_REQUIRED_GUARD",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "draft",
        account: { user_id: "u1", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: true,
      }).code === "not_approved"
    );
    pass(
      "UNAPPROVED_BLOCKS_PUBLISH",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "pending",
        account: { user_id: "u1", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: true,
      }).youtubeCalled === false
    );
    pass(
      "DUPLICATE_BLOCKS",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "approved",
        account: { user_id: "u1", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: { id: "pj1", publish_status: "uploading" },
        hasGoogleCreds: true,
      }).code === "duplicate_publish"
    );
    pass(
      "TOKEN_EXPIRED_GUARD",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "approved",
        account: { user_id: "u1", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() - 1000).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: true,
      }).code === "token_expired"
    );
    pass(
      "REVOKED_GUARD",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "approved",
        account: { user_id: "u1", status: "revoked", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: true,
      }).code === "revoked"
    );
    pass(
      "WRONG_OWNER_BLOCKED",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "approved",
        account: { user_id: "u2", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: true,
      }).status === 403
    );
    pass(
      "WRONG_PLATFORM_BLOCKED",
      guards.decideYouTubePublish({
        user: { id: "u1" },
        entitlement: { social_publish: true },
        approvalStatus: "approved",
        account: { user_id: "u1", status: "active", platform: "tiktok", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
        job: { user_id: "u1", status: "completed", output_url: "https://x/a_final.mp4" },
        existing: null,
        hasGoogleCreds: true,
      }).code === "wrong_platform"
    );
    const okMedia = guards.decideYouTubePublish({
      user: { id: "u1" },
      entitlement: { social_publish: true },
      approvalStatus: "approved",
      account: { user_id: "u1", status: "active", platform: "youtube", token_expires_at: new Date(Date.now() + 3600e3).toISOString() },
      job: {
        user_id: "u1",
        status: "completed",
        output_url: "https://dgrkcuddnfhkwsclviqk.supabase.co/storage/v1/object/public/videoupload/outputs/abc_final.mp4",
      },
      existing: null,
      hasGoogleCreds: true,
    });
    pass("COMPLETED_MP4_SELECTED", okMedia.videoUrl && okMedia.videoUrl.includes("_final.mp4") && okMedia.youtubeCalled === true);

    pass("YT_PRIVACY_PRIVATE", guards.mapYouTubePrivacy("private") === "private");
    pass("YT_PRIVACY_UNLISTED", guards.mapYouTubePrivacy("unlisted") === "unlisted");
    pass("YT_PRIVACY_PUBLIC", guards.mapYouTubePrivacy("public") === "public");
    pass("YT_PRIVACY_REJECTS_TIKTOK_ENUM", guards.mapYouTubePrivacy("SELF_ONLY") === null);

    const init = proto.buildResumableInit({
      title: "Short title",
      description: "Short description",
      privacy: "private",
      contentType: "video/mp4",
      contentLength: 12345,
    });
    pass("RESUMABLE_INIT_URL", init.url.includes("https://www.googleapis.com/upload/youtube/v3/videos") && init.url.includes("uploadType=resumable"));
    pass(
      "RESUMABLE_INIT_SHAPE",
      init.method === "POST" &&
        init.headers["Content-Type"].includes("application/json") &&
        init.headers["X-Upload-Content-Type"] === "video/mp4" &&
        init.body.snippet.title === "Short title" &&
        init.body.snippet.description === "Short description" &&
        init.body.status.privacyStatus === "private"
    );
    const chunk = proto.buildChunkPut({
      sessionUrl: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc",
      start: 0,
      end: 255,
      total: 1000,
    });
    pass("CHUNK_PUT_USES_SESSION", chunk.method === "PUT" && chunk.url.includes("upload_id=abc") && chunk.headers["Content-Range"] === "bytes 0-255/1000");
    pass("FINALIZE_READS_VIDEO_ID", proto.readVideoId({ id: "vid123" }) === "vid123");
    const refresh = proto.buildRefreshTokenRequest({ clientId: "cid", clientSecret: "sec", refresh_token: "rt" });
    pass("REFRESH_TOKEN_GRANT", refresh.url === "https://oauth2.googleapis.com/token" && refresh.body.includes("grant_type=refresh_token"));
  }

  // ---- Owner GO: connection state from DB, error surfacing, NULL dedupe ----
  {
    const autoPath = path.join(root, "src/pages/AutoUpload.tsx");
    const auto = readFileSync(autoPath, "utf8");
    pass("AUTOUPLOAD_READS_SOCIAL_ACCOUNTS", auto.includes('.from("social_accounts")'));
    // Every selected column must be in the safe allowlist (stronger than pinning
    // one exact string). platform_account_id is safe: it is the channel/Page id
    // already returned by the oauth `status` actions, never token material.
    const SAFE_AUTOUPLOAD_COLS = [
      "id",
      "platform",
      "platform_account_id",
      "platform_username",
      "display_name",
      "status",
      "created_at",
    ];
    const autoSelect = auto.match(/select\("([^"]+)"\)/);
    const autoCols = autoSelect ? autoSelect[1].split(",").map((c) => c.trim()) : [];
    pass(
      "AUTOUPLOAD_SELECTS_SAFE_COLUMNS",
      autoCols.length > 0 && autoCols.every((c) => SAFE_AUTOUPLOAD_COLS.includes(c)),
    );
    pass("AUTOUPLOAD_NO_TOKEN_COLUMN_IN_SELECT", !/select\([^)]*token[^)]*\)/.test(auto));
    pass("AUTOUPLOAD_LOADS_ON_MOUNT", auto.includes("loadSocialAccounts();"));
    pass("AUTOUPLOAD_COUNT_FROM_STATE_NOT_HARDCODED", auto.includes("socialAccounts.filter(account => account.connected).length"));
    pass("AUTOUPLOAD_MAPS_ACTIVE_STATUS", auto.includes('r.status === "active"'));
    pass("AUTOUPLOAD_USES_READ_EDGE_FUNCTION_ERROR", auto.includes("readEdgeFunctionError("));
    pass("AUTOUPLOAD_NO_GENERIC_EDGE_ERROR_DISPLAY", !auto.includes("error.message || `Failed to connect"));

    const ytOauth = readFileSync(path.join(root, "supabase/functions/youtube-oauth/index.ts"), "utf8");
    pass("OAUTH_NO_NULL_UNSAFE_UPSERT", !ytOauth.includes('upsert(row, { onConflict: "user_id,platform,platform_account_id" })'));
    pass("OAUTH_UPDATES_EXISTING_ROW", ytOauth.includes('.update(row)') && ytOauth.includes('.eq("id", existingAccount.id)'));
    pass("OAUTH_INSERTS_WHEN_ABSENT", ytOauth.includes('.insert(row)'));
    pass("OAUTH_DUPLICATE_409", ytOauth.includes('"duplicate_account"') && ytOauth.includes('"23505"'));
    pass("OAUTH_NEVER_DELETES_ACCOUNT", !ytOauth.includes('.from("social_accounts").delete'));

    const mig = readFileSync(
      path.join(root, "supabase/migrations/20260914020000_social_accounts_null_dedupe.sql"),
      "utf8",
    );
    pass("MIG_DEDUPE_INDEX", mig.includes("CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_platform_acct_uniq"));
    pass("MIG_DEDUPE_COALESCE_NULL", mig.includes("COALESCE(platform_account_id, '')"));
    pass("MIG_DEDUPE_NO_DELETE", !/\bDELETE\b/i.test(mig));
    pass("MIG_DEDUPE_NO_DROP_TABLE", !/DROP\s+TABLE/i.test(mig));
  }

  // ---- Phase C1: channel identity scope ----
  {
    const ytOauth = readFileSync(path.join(root, "supabase/functions/youtube-oauth/index.ts"), "utf8");
    pass("C1_READONLY_SCOPE_ADDED", ytOauth.includes("https://www.googleapis.com/auth/youtube.readonly"));
    pass("C1_UPLOAD_SCOPE_KEPT", ytOauth.includes("https://www.googleapis.com/auth/youtube.upload"));
    pass("C1_NO_BROADER_SCOPES", !/auth\/youtube\s*"|youtube\.force-ssl|\/auth\/youtube$/.test(ytOauth));
    pass("C1_STORES_CHANNEL_ID", ytOauth.includes("platform_account_id: channelId"));
    pass("C1_STORES_DISPLAY_NAME", ytOauth.includes("display_name: display"));
    pass("C1_CHANNELS_LIST_MINE", ytOauth.includes("channels?part=snippet,id&mine=true"));
    pass("C1_UPDATE_IN_PLACE_ONLY", ytOauth.includes('.update(row)') && !ytOauth.includes(".upsert("));

    // Re-authorize must reuse the existing flow and never disconnect/delete.
    const autoReauth = readFileSync(path.join(root, "src/pages/AutoUpload.tsx"), "utf8");
    pass("REAUTH_BUTTON_PRESENT", autoReauth.includes("Re-authorize YouTube"));
    pass("REAUTH_USES_EXISTING_FLOW", autoReauth.includes('onClick={() => connectPlatform(account.platform)}'));
    pass("REAUTH_ONLY_FOR_YOUTUBE", autoReauth.includes('account.platform === "YouTube Shorts" &&'));
    const reauthStart = autoReauth.indexOf('account.platform === "YouTube Shorts" && (');
    const disconnectStart = autoReauth.indexOf("disconnectPlatform(account.platform)");
    const reauthBlock =
      reauthStart >= 0 && disconnectStart > reauthStart
        ? autoReauth.slice(reauthStart, disconnectStart)
        : "";
    pass(
      "REAUTH_NO_DISCONNECT_CALL",
      reauthBlock.includes("connectPlatform(account.platform)") && !reauthBlock.includes("disconnectPlatform"),
    );
    pass("REAUTH_NO_REVOKE_ACTION", !autoReauth.includes('action: "revoke"'));
    pass("REAUTH_DOES_NOT_HIDE_DISCONNECT", autoReauth.includes("disconnectPlatform(account.platform)"));
    pass("REAUTH_NO_ACCOUNT_DELETE", !autoReauth.includes('.from("social_accounts").delete'));
  }

  // ---- UI-path publish failure contract ----
  {
    const panel = readFileSync(path.join(root, "src/components/SocialPublishPanel.tsx"), "utf8");
    pass("PANEL_USES_READ_EDGE_FUNCTION_ERROR", panel.includes("readEdgeFunctionError("));
    pass("PANEL_NO_GENERIC_EDGE_ERROR_TOAST", !panel.includes("error?.message || \"Publish did not start\""));
    pass("PANEL_LOADS_EXISTING_PUBLISHES", panel.includes('.from("publish_jobs")') && panel.includes('.eq("boom_job_id", jobId)'));
    pass("PANEL_PUBLISH_SELECT_SAFE", panel.includes('select("id,platform,social_account_id,publish_status,platform_post_url")'));
    pass("PANEL_NO_TOKEN_COLUMNS_IN_SELECT", !/select\([^)]*(token|encrypted)[^)]*\)/.test(panel));
    pass("PANEL_YOUTUBE_ALREADY_PUBLISHED", panel.includes('data-cy="youtube-already-published"'));
    pass("PANEL_TIKTOK_ALREADY_PUBLISHED", panel.includes('data-cy="tiktok-already-published"'));
    pass(
      "PANEL_BLOCKS_REPUBLISH",
      panel.includes("existingYouTube ? (") && panel.includes("existingTikTok ? ("),
    );
    pass(
      "PANEL_IGNORES_FAILED_ROWS",
      panel.includes('r.publish_status !== "failed"'),
    );
    pass("PANEL_STILL_HAS_APPROVE_BUTTONS", panel.includes('data-cy="approve-and-publish"') && panel.includes('data-cy="youtube-approve-and-publish"'));
  }

  // ---- Phase C2: token column privileges ----
  {
    const priv = readFileSync(
      path.join(root, "supabase/migrations/20260914030000_social_accounts_revoke_token_columns.sql"),
      "utf8",
    );
    pass("C2_REVOKES_TABLE_PRIVS_ANON", /REVOKE ALL PRIVILEGES ON public\.social_accounts FROM anon;/i.test(priv));
    pass("C2_REVOKES_TABLE_PRIVS_AUTHENTICATED", /REVOKE ALL PRIVILEGES ON public\.social_accounts FROM authenticated;/i.test(priv));
    const grantSection = priv.split("GRANT").slice(1).join("GRANT");
    pass("C2_REGRANTS_SELECT_SAFE", grantSection.includes("id, user_id, platform, platform_account_id"));
    pass("C2_GRANTS_EXCLUDE_ACCESS_TOKEN", !grantSection.includes("access_token_encrypted"));
    pass("C2_GRANTS_EXCLUDE_REFRESH_TOKEN", !grantSection.includes("refresh_token_encrypted"));
    pass("C2_NO_DELETE_OR_DROP", !/\bDELETE\b/i.test(priv) && !/DROP\s+(TABLE|COLUMN)/i.test(priv));
    pass("C2_NO_RLS_CHANGE", !/ROW LEVEL SECURITY|DROP POLICY/i.test(priv));
    pass("C2_TOUCHES_ONLY_SOCIAL_ACCOUNTS", !/publish_jobs|jobs_new|social_oauth_states/.test(priv));
  }

  // ---- Phase C3: upload worker readiness ----
  {
    const worker = readFileSync(path.join(root, "ai-worker/youtube_upload.py"), "utf8");
    pass("C3_RESUMABLE_INSERT_URL", worker.includes("uploadType=resumable") && worker.includes("part=snippet,status"));
    pass("C3_VIDEOS_INSERT_ENDPOINT", worker.includes("/upload/youtube/v3/videos"));
    pass("C3_STREAMS_MEDIA_NOT_RAM", worker.includes("def download_mp4") && worker.includes("1024 * 1024") && worker.includes("max_bytes"));
    pass("C3_SIZE_CAP_ENFORCED", worker.includes("media_too_large"));
    pass("C3_NO_TOKEN_LOGGING", !/\bprint\(|logging\.|logger\./.test(worker));
    const workerMain = readFileSync(path.join(root, "ai-worker/main.py"), "utf8");
    pass("C3_PRIVACY_VALIDATED", workerMain.includes('if req.privacy not in ("private", "unlisted", "public")'));
    pass("C3_TEMP_CLEANUP", worker.includes("os.remove(dest)"));
    pass("C3_CHUNK_MULTIPLE_OF_256K", worker.includes("CHUNK = 8 * 1024 * 1024"));

    const main = readFileSync(path.join(root, "ai-worker/main.py"), "utf8");
    pass("C3_ROUTE_REQUIRES_WORKER_AUTH", main.includes("require_worker_auth"));
    pass("C3_ROUTE_NOT_GATE77_PATH", main.includes('@app.post("/social/youtube-upload")'));

    const pub = readFileSync(path.join(root, "supabase/functions/youtube-publish/index.ts"), "utf8");
    pass("C3_PERSISTS_VIDEO_ID", pub.includes("platform_post_id: videoId") && pub.includes("platform_publish_id: videoId"));
    pass("C3_PERSISTS_URL", pub.includes("youtube.com/shorts/"));
    pass("C3_FAILURE_RECORDED", pub.includes('publish_status: "failed"') && pub.includes("error_code"));
    pass("C3_APPROVAL_REQUIRED_UPSTREAM", pub.includes("assertApproved") && pub.includes("not_approved"));
    pass("C3_REFRESH_SUPPORTED", pub.includes("buildRefreshTokenRequest") && pub.includes("token_expired"));
    pass(
      "C3_NO_BROWSER_TOKEN_EXPOSURE",
      pub.includes("safeAccount(") &&
        pub.includes("sanitizeYouTubeError(") &&
        !/json\(\s*200[^)]*access_token/.test(pub),
    );
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
