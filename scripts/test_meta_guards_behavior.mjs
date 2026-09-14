#!/usr/bin/env node
/**
 * Gate #78 Meta — BEHAVIORAL tests.
 *
 * The contract test asserts the shape of the source; this one actually EXECUTES
 * the pure guard and protocol logic (transpiled with esbuild) so the decisions
 * are verified rather than assumed.
 */
import esbuild from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dir = mkdtempSync(path.join(tmpdir(), "meta-t-"));

async function load(rel) {
  const src = (await import("node:fs")).readFileSync(path.join(root, rel), "utf8");
  const { code } = esbuild.transformSync(src, { loader: "ts", format: "esm" });
  const f = path.join(dir, path.basename(rel).replace(/\.ts$/, ".mjs"));
  writeFileSync(f, code);
  return import(pathToFileURL(f).href);
}

const G = await load("supabase/functions/_shared/meta_guards.ts");
const P = await load("supabase/functions/_shared/meta_publish_protocol.ts");

let pass = 0;
let fail = 0;
const eq = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} :: got ${a} want ${e}`);
  }
};
const ok = (name, cond, extra) => eq(name, Boolean(cond), true) || (extra && console.log("   " + extra));

const base = () => ({
  user: { id: "u1" },
  entitlement: { social_publish: true },
  approvalStatus: "approved",
  platform: "facebook",
  account: { user_id: "u1", status: "active", platform: "facebook", token_expires_at: null },
  job: { user_id: "u1", status: "completed", output_url: "https://x/v.mp4" },
  existing: null,
  hasMetaCreds: true,
});

console.log("--- privacy (facebook public-only, instagram platform default) ---");
eq("FB_PRIVACY_EMPTY_IS_PUBLIC", G.mapMetaPrivacy("facebook", ""), "PUBLIC");
eq("FB_PRIVACY_PUBLIC_OK", G.mapMetaPrivacy("facebook", "PUBLIC"), "PUBLIC");
eq("FB_PRIVACY_PRIVATE_REFUSED", G.mapMetaPrivacy("facebook", "private"), null);
eq("FB_PRIVACY_UNLISTED_REFUSED", G.mapMetaPrivacy("facebook", "unlisted"), null);
eq("FB_PRIVACY_TIKTOK_VALUE_REFUSED", G.mapMetaPrivacy("facebook", "SELF_ONLY"), null);
eq("IG_PRIVACY_EMPTY_IS_DEFAULT", G.mapMetaPrivacy("instagram", ""), "PLATFORM_DEFAULT");
eq("IG_PRIVACY_DEFAULT_OK", G.mapMetaPrivacy("instagram", "PLATFORM_DEFAULT"), "PLATFORM_DEFAULT");
eq("IG_PRIVACY_PUBLIC_REFUSED", G.mapMetaPrivacy("instagram", "PUBLIC"), null);
eq("IG_PRIVACY_TIKTOK_VALUE_REFUSED", G.mapMetaPrivacy("instagram", "SELF_ONLY"), null);

console.log("--- safeAccount never leaks ciphertext ---");
eq(
  "SAFE_ACCOUNT_STRIPS_TOKENS",
  G.safeAccount({ id: "a", access_token_encrypted: "SECRET1", refresh_token_encrypted: "SECRET2", status: "active" }),
  { id: "a", status: "active" },
);
eq("SAFE_ACCOUNT_NULL_SAFE", G.safeAccount(null), null);

console.log("--- oauth start / link fail-closed ---");
eq("START_UNAUTH", G.decideMetaOAuthStart({ user: null, hasMetaCreds: true }).status, 401);
eq("START_NO_CREDS", G.decideMetaOAuthStart({ user: { id: "u" }, hasMetaCreds: false }).status, 503);
eq("START_OK", G.decideMetaOAuthStart({ user: { id: "u" }, hasMetaCreds: true }).status, 200);

const scopes = G.META_SCOPE_LIST;
eq("LINK_UNAUTH", G.decideMetaLink({ user: null, hasMetaCreds: true, pages: [], grantedScopes: scopes }).code, "unauthenticated");
eq("LINK_NO_CREDS", G.decideMetaLink({ user: { id: "u" }, hasMetaCreds: false, pages: [], grantedScopes: scopes }).code, "oauth_not_configured");
eq(
  "LINK_MISSING_PERMISSIONS",
  G.decideMetaLink({ user: { id: "u" }, hasMetaCreds: true, pages: [{ id: "p1" }], grantedScopes: ["pages_show_list"] }).code,
  "missing_permissions",
);
eq("LINK_NO_PAGE", G.decideMetaLink({ user: { id: "u" }, hasMetaCreds: true, pages: [], grantedScopes: scopes }).code, "no_page");
eq(
  "LINK_PAGE_FORBIDDEN",
  G.decideMetaLink({ user: { id: "u" }, hasMetaCreds: true, pages: [{ id: "p1" }], pageId: "p9", grantedScopes: scopes }).code,
  "page_forbidden",
);
const noIg = G.decideMetaLink({ user: { id: "u" }, hasMetaCreds: true, pages: [{ id: "p1" }], grantedScopes: scopes });
eq("LINK_PAGE_NO_IG_CANNOT_CREATE_IG", [noIg.status, noIg.canCreateFacebook, noIg.canCreateInstagram], [200, true, false]);
eq("LINK_PAGE_NO_IG_CODE", noIg.code, "no_ig_professional_account");
const withIg = G.decideMetaLink({
  user: { id: "u" }, hasMetaCreds: true, pages: [{ id: "p1" }], instagramBusinessAccountId: "ig1", grantedScopes: scopes,
});
eq("LINK_PAGE_WITH_IG", [withIg.status, withIg.canCreateFacebook, withIg.canCreateInstagram, withIg.code], [200, true, true, "ok"]);
eq("MISSING_PERMISSIONS_LIST", G.missingPermissions(["pages_show_list"], ["pages_show_list", "instagram_basic"]), ["instagram_basic"]);

console.log("--- decideMetaPublish: full order + fail-closed ---");
const d = (over) => G.decideMetaPublish({ ...base(), ...over });
eq("PUBL_UNAUTH", d({ user: null }).code, "unauthenticated");
eq("PUBL_NOT_ENTITLED", d({ entitlement: { social_publish: false } }).code, "not_entitled");
eq("PUBL_NO_ENTITLEMENT_ROW", d({ entitlement: null }).code, "not_entitled");
eq("PUBL_BAD_PLATFORM", d({ platform: "tiktok" }).code, "bad_platform");
eq("PUBL_ACCOUNT_FORBIDDEN", d({ account: { user_id: "other", status: "active" } }).code, "account_forbidden");
eq("PUBL_WRONG_PLATFORM", d({ account: { user_id: "u1", status: "active", platform: "instagram" } }).code, "wrong_platform");
eq("PUBL_JOB_FORBIDDEN", d({ job: { user_id: "other", status: "completed", output_url: "x" } }).code, "job_forbidden");
eq("PUBL_UNSUPPORTED_MEDIA", d({ job: { user_id: "u1", status: "processing", output_url: "x" } }).code, "unsupported_media");
eq("PUBL_NO_OUTPUT_URL", d({ job: { user_id: "u1", status: "completed", output_url: null } }).code, "unsupported_media");
eq("PUBL_REVOKED", d({ account: { user_id: "u1", status: "revoked" } }).code, "revoked");
eq("PUBL_TOKEN_EXPIRED_STATUS", d({ account: { user_id: "u1", status: "expired" } }).code, "token_expired");
eq("PUBL_TOKEN_EXPIRED_DATE", d({ account: { user_id: "u1", status: "active", token_expires_at: "2000-01-01T00:00:00Z" } }).code, "token_expired");
eq("PUBL_NOT_APPROVED", d({ approvalStatus: "pending" }).code, "not_approved");
eq("PUBL_DUPLICATE", d({ existing: { id: "j1", publish_status: "published" } }).code, "duplicate_publish");
eq("PUBL_NO_CREDS", d({ hasMetaCreds: false }).code, "oauth_not_configured");
const okc = d({});
eq("PUBL_OK", [okc.status, okc.code, okc.metaCalled, okc.videoUrl], [200, "ok", true, "https://x/v.mp4"]);
eq("PUBL_OK_INSTAGRAM", d({ platform: "instagram", account: { user_id: "u1", status: "active", platform: "instagram" } }).metaCalled, true);
eq("APPROVAL_THROWS_WHEN_NOT_APPROVED", (() => { try { G.assertApproved("pending"); return "no-throw"; } catch (e) { return e.message; } })(), "APPROVAL_REQUIRED");
eq("APPROVAL_OK_NO_THROW", (() => { try { G.assertApproved("approved"); return "ok"; } catch { return "threw"; } })(), "ok");

console.log("--- sanitized errors ---");
ok("SANITIZE_EAA_TOKEN", !/EAA[A-Za-z0-9_-]{10,}/.test(G.sanitizeMetaError("bad token EAAAbcdef1234567890")));
ok("SANITIZE_BEARER", !/Bearer abc123/.test(G.sanitizeMetaError("Bearer abc123")));
ok("SANITIZE_ACCESS_TOKEN_PARAM", !/access_token=secret/.test(G.sanitizeMetaError("access_token=secret")));
ok("SANITIZE_CLIENT_SECRET", !/client_secret=xyz/.test(G.sanitizeMetaError("client_secret=xyz")));

console.log("--- status mapping ---");
eq("STATUS_POSTED", G.mapMetaPublishStatus({ httpStatus: 200, postedId: "v1" }), "published");
eq("STATUS_401_EXPIRED", G.mapMetaPublishStatus({ httpStatus: 401 }), "token_expired");
eq("STATUS_GRAPH_190_EXPIRED", G.mapMetaPublishStatus({ httpStatus: 400, graphErrorCode: 190 }), "token_expired");
eq("STATUS_RATE_LIMIT", G.mapMetaPublishStatus({ httpStatus: 429 }), "processing");
eq("STATUS_GRAPH_4_RATE", G.mapMetaPublishStatus({ httpStatus: 400, graphErrorCode: 4 }), "processing");
eq("STATUS_400_FAILED", G.mapMetaPublishStatus({ httpStatus: 400 }), "failed");
eq("STATUS_500_FAILED", G.mapMetaPublishStatus({ httpStatus: 500 }), "failed");

console.log("--- protocol: facebook reels start/upload/finish ---");
const fb = P.buildFacebookReelPlan({
  pageId: "123", pageAccessToken: "TOK", videoUrl: "https://x/v.mp4", description: "hello", videoId: "vid1",
});
ok("FB_VERSION_PINNED", fb.startUrl.includes(`/${P.GRAPH_VERSION}/`), fb.startUrl);
ok("FB_START_URL", fb.startUrl.endsWith("/123/video_reels"), fb.startUrl);
eq("FB_START_BODY_PHASE", fb.startBody.upload_phase, "start");
ok("FB_UPLOAD_HOST", fb.uploadUrlTemplate.startsWith("https://rupload.facebook.com/video-upload/"), fb.uploadUrlTemplate);
ok("FB_UPLOAD_USES_FILE_URL", fb.uploadHeaders.file_url === "https://x/v.mp4");
ok("FB_UPLOAD_OAUTH_HEADER", fb.uploadHeaders.Authorization === "OAuth TOK");
eq("FB_FINISH_PHASE", fb.finishBody.upload_phase, "finish");
eq("FB_FINISH_STATE_PUBLISHED", fb.finishBody.video_state, "PUBLISHED");
eq("FB_FINISH_VIDEO_ID", fb.finishBody.video_id, "vid1");
eq("FB_FINISH_DESCRIPTION", fb.finishBody.description, "hello");
ok("FB_FINISH_HAS_NO_PRIVACY_FIELD", !("privacy" in fb.finishBody) && !("privacy_level" in fb.finishBody), JSON.stringify(fb.finishBody));
ok("FB_PLAN_HAS_NO_PRIVACY_ANYWHERE", !JSON.stringify(fb).toLowerCase().includes("privacy"));

console.log("--- protocol: instagram reels container/poll/publish ---");
const ig = P.buildInstagramReelPlan({ igUserId: "ig9", igAccessToken: "TOK", videoUrl: "https://x/v.mp4", caption: "cap" });
ok("IG_VERSION_PINNED", ig.containerUrl.includes(`/${P.GRAPH_VERSION}/`), ig.containerUrl);
ok("IG_CONTAINER_URL", ig.containerUrl.endsWith("/ig9/media"), ig.containerUrl);
eq("IG_MEDIA_TYPE_REELS", ig.containerBody.media_type, "REELS");
eq("IG_VIDEO_URL", ig.containerBody.video_url, "https://x/v.mp4");
eq("IG_CAPTION", ig.containerBody.caption, "cap");
ok("IG_PUBLISH_URL", ig.publishUrl.endsWith("/ig9/media_publish"), ig.publishUrl);
eq("IG_PUBLISH_BODY_CREATION_ID", Object.keys(ig.publishBodyTemplate).includes("creation_id"), true);
ok("IG_STATUS_URL_FIELDS", P.instagramStatusUrl("c1").includes("fields=status_code"));
eq("IG_PHASE_FINISHED", P.instagramStatusToPhase("FINISHED"), "publish");
eq("IG_PHASE_IN_PROGRESS", P.instagramStatusToPhase("IN_PROGRESS"), "poll");
eq("IG_PHASE_PUBLISHED", P.instagramStatusToPhase("PUBLISHED"), "published");
eq("IG_PHASE_EXPIRED", P.instagramStatusToPhase("EXPIRED"), "failed");
eq("IG_PHASE_ERROR", P.instagramStatusToPhase("ERROR"), "failed");
eq("IG_PHASE_UNKNOWN_CONSERVATIVE", P.instagramStatusToPhase("WHATEVER"), "poll");
eq("IG_PHASE_NULL_CONSERVATIVE", P.instagramStatusToPhase(null), "poll");
eq("IG_POST_IDS", P.extractMetaPostIds("instagram", { id: "m1", permalink: "https://ig/p/m1" }),
  { platform_publish_id: "m1", platform_post_id: "m1", platform_post_url: "https://ig/p/m1" });
eq("FB_POST_IDS", P.extractMetaPostIds("facebook", { video_id: "v1" }).platform_post_id, "v1");

console.log("--- graph client ---");
const mk = (status, body, ok = true) => async () => ({ ok, status, json: async () => body, text: async () => "" });
const r1 = await P.metaGraphRequest(mk(200, { video_id: "v1" }), "https://graph.facebook.com/x", {});
eq("CLIENT_OK", [r1.ok, r1.status, r1.body.video_id], [true, 200, "v1"]);
const r2 = await P.metaGraphRequest(mk(400, { error: { code: 190, message: "expired" } }, false), "u", {});
eq("CLIENT_GRAPH_ERROR", [r2.ok, r2.status, r2.graphErrorCode, r2.graphErrorMessage], [false, 400, 190, "expired"]);
const r3 = await P.metaGraphRequest(async () => { throw new Error("boom"); }, "u", {});
eq("CLIENT_NETWORK_ERROR_SAFE", [r3.ok, r3.status, r3.graphErrorMessage], [false, 0, "network_error"]);
const r4 = await P.metaGraphRequest(async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); }, text: async () => "" }), "u", {});
eq("CLIENT_BAD_JSON_SAFE", [r4.ok, r4.body], [true, {}]);

console.log(`\nTEST_RESULTS=${fail === 0 ? "ALL_PASS" : "FAIL"} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
