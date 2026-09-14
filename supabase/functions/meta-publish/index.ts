import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, loadKeyFromEnv } from "../_shared/social_token_crypto.ts";
import {
  GRAPH_VERSION,
  assertApproved,
  decideMetaPublish,
  isMetaPlatform,
  mapMetaPrivacy,
  mapMetaPublishStatus,
  metaErrorText,
  safeAccount,
  sanitizeMetaError,
} from "../_shared/meta_guards.ts";
import {
  buildFacebookReelFinishBody,
  buildFacebookReelPlan,
  buildInstagramContainerBody,
  buildInstagramPublishBody,
  facebookReelFinishUrl,
  facebookReelStartUrl,
  instagramContainerUrl,
  instagramPublishUrl,
  instagramStatusToPhase,
  instagramStatusUrl,
  metaGraphRequest,
} from "../_shared/meta_publish_protocol.ts";

/**
 * Gate #78 Meta publish — Facebook Reels + Instagram Reels.
 *
 * Guard order is identical to the proven youtube-publish path:
 *   auth -> entitlement -> job ownership -> account ownership -> duplicate ->
 *   approval -> publish_jobs insert -> token decrypt -> platform API -> persist
 *
 * Edge-only: Meta ingests the public Boom MP4 itself (file_url / video_url), so
 * there is NO Cloud Run worker handoff and the Gate #77 render path is untouched.
 * Tokens are decrypted server-side and never returned to the browser.
 */

const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 5000;

/** Explicit HTTP mapping so every guard code has a deliberate status. */
const META_BLOCK_STATUS: Record<string, number> = {
  unauthenticated: 401,
  not_entitled: 403,
  account_forbidden: 403,
  wrong_platform: 403,
  job_forbidden: 403,
  revoked: 403,
  not_approved: 403,
  token_expired: 401,
  unsupported_media: 422,
  bad_platform: 400,
  duplicate_publish: 409,
  oauth_not_configured: 503,
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envFirst(...names: string[]): string | undefined {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  return undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "No authorization header", code: "unauthenticated" });

  const userSb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader! } },
  });
  const { data: { user }, error: userError } = await userSb.auth.getUser();
  if (userError || !user) return json(401, { error: "User not authenticated", code: "unauthenticated" });

  const { data: entitlementRows, error: entErr } = await userSb.rpc("account_entitlements", {
    user_uuid: user.id,
  });
  if (entErr || !entitlementRows || entitlementRows.length === 0) {
    return json(403, { error: "Social publishing is not included in your plan.", code: "not_entitled" });
  }
  const entitlements = entitlementRows[0];
  if (entitlements.social_publish !== true) {
    return json(403, { error: "Social publishing is not included in your plan.", code: "not_entitled" });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON", code: "bad_json" });
  }

  const action = String(body.action || "publish");
  const admin = createClient(supabaseUrl, serviceKey);
  const hasMetaCreds = Boolean(
    envFirst("META_APP_ID", "META_CLIENT_ID", "FACEBOOK_APP_ID") &&
      envFirst("META_APP_SECRET", "META_CLIENT_SECRET", "FACEBOOK_APP_SECRET"),
  );

  if (action === "status") {
    const publishJobId = String(body.publishJobId || "");
    const { data: row } = await admin.from("publish_jobs").select("*").eq("id", publishJobId).maybeSingle();
    if (!row || row.user_id !== user.id) return json(403, { error: "Not found", code: "job_forbidden" });
    const { data: account } = await admin
      .from("social_accounts")
      .select("id,user_id,platform,platform_username,display_name,status")
      .eq("id", row.social_account_id)
      .maybeSingle();
    return json(200, { publishJob: row, account: safeAccount(account as Record<string, unknown>) });
  }

  const platform = String(body.platform || "");
  const boomJobId = String(body.boomJobId || "");
  const socialAccountId = String(body.socialAccountId || "");
  const title = typeof body.title === "string" ? body.title : "";
  const description = typeof body.description === "string"
    ? body.description
    : (typeof body.caption === "string" ? body.caption : "");
  const approvalStatus = String(body.approvalStatus || "");

  const { data: job } = await admin
    .from("jobs_new")
    .select("id,user_id,status,output_url")
    .eq("id", boomJobId)
    .maybeSingle();
  const { data: account } = await admin
    .from("social_accounts")
    .select("*")
    .eq("id", socialAccountId)
    .maybeSingle();
  const { data: existing } = await admin
    .from("publish_jobs")
    .select("id,publish_status,approval_status")
    .eq("boom_job_id", boomJobId)
    .eq("social_account_id", socialAccountId)
    .maybeSingle();

  const decision = decideMetaPublish({
    user: { id: user.id },
    entitlement: { social_publish: entitlements.social_publish === true },
    approvalStatus,
    platform,
    account: account as any,
    job: job as any,
    existing,
    hasMetaCreds,
  });

  if (decision.status !== 200) {
    const status = META_BLOCK_STATUS[decision.code] || decision.status;
    return json(status, { error: metaErrorText(decision.code), code: decision.code });
  }
  if (!isMetaPlatform(platform)) {
    return json(400, { error: "Unsupported platform", code: "bad_platform" });
  }

  const privacy = mapMetaPrivacy(platform, typeof body.privacyLevel === "string" ? body.privacyLevel : "");
  if (!privacy) {
    return json(400, { error: metaErrorText("bad_privacy"), code: "bad_privacy" });
  }

  try {
    assertApproved(approvalStatus);
  } catch {
    return json(403, { error: "Owner approval is required before publishing.", code: "not_approved" });
  }

  const videoUrl = job!.output_url as string;

  const { data: inserted, error: insErr } = await admin.from("publish_jobs").insert({
    user_id: user.id,
    social_account_id: socialAccountId,
    boom_job_id: boomJobId,
    platform,
    title: title || null,
    caption: description || null,
    description: description || null,
    privacy_level: privacy,
    approval_status: "approved",
    approved_at: new Date().toISOString(),
    publish_status: "pending",
  }).select("*").maybeSingle();

  if (insErr) {
    if (String(insErr.code) === "23505" || /duplicate/i.test(insErr.message || "")) {
      return json(409, { error: metaErrorText("duplicate_publish"), code: "duplicate_publish" });
    }
    return json(500, { error: "Failed to create publish job", code: "persist_failed" });
  }

  const publishJobId = inserted!.id as string;

  const encKey = await loadKeyFromEnv(envFirst("SOCIAL_TOKEN_ENCRYPTION_KEY", "SOCIAL_TOKEN_KEY"));
  if (!encKey || !account?.access_token_encrypted) {
    await admin.from("publish_jobs").update({
      publish_status: "failed",
      error_code: "encryption_unconfigured",
      error_message_sanitized: "Token encryption unavailable",
    }).eq("id", publishJobId);
    return json(500, { error: "Token encryption unavailable", code: "encryption_unconfigured", publishJobId });
  }

  let token = "";
  try {
    token = await decryptToken(String(account.access_token_encrypted), encKey);
  } catch {
    await admin.from("publish_jobs").update({
      publish_status: "failed",
      error_code: "token_decrypt_failed",
      error_message_sanitized: "Stored Meta token could not be decrypted",
    }).eq("id", publishJobId);
    return json(500, { error: "Stored Meta token could not be decrypted", code: "token_decrypt_failed", publishJobId });
  }

  await admin.from("publish_jobs").update({ publish_status: "uploading" }).eq("id", publishJobId);

  const fetchImpl = fetch as unknown as Parameters<typeof metaGraphRequest>[0];
  const ownerAccountId = String(account.platform_account_id || "");

  // ------------------------------------------------------------- Facebook -- //
  if (platform === "facebook") {
    if (!ownerAccountId) {
      await admin.from("publish_jobs").update({
        publish_status: "failed",
        error_code: "no_page",
        error_message_sanitized: "Facebook Page id missing on the connected account",
      }).eq("id", publishJobId);
      return json(422, { error: metaErrorText("no_page"), code: "no_page", publishJobId });
    }

    // Step 1 — initialise the upload session.
    const start = await metaGraphRequest(fetchImpl, facebookReelStartUrl(ownerAccountId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_phase: "start", access_token: token }),
    });
    const videoId = start.body?.video_id ? String(start.body.video_id) : "";
    if (!start.ok || !videoId) {
      const status = mapMetaPublishStatus({ httpStatus: start.status, graphErrorCode: start.graphErrorCode });
      await admin.from("publish_jobs").update({
        publish_status: status,
        error_code: "graph_start_failed",
        error_message_sanitized: sanitizeMetaError(start.graphErrorMessage || "start_failed"),
      }).eq("id", publishJobId);
      return json(status === "token_expired" ? 401 : 502, {
        error: "Meta upload could not be started",
        code: "graph_start_failed",
        publishJobId,
      });
    }

    // Step 2 — hand Meta the public MP4 (no bytes through our runtime).
    const uploadUrl = start.body?.upload_url ? String(start.body.upload_url) : "";
    const plan = buildFacebookReelPlan({
      pageId: ownerAccountId,
      pageAccessToken: token,
      videoUrl,
      description,
      videoId,
    });
    const upload = await metaGraphRequest(fetchImpl, uploadUrl || plan.uploadUrlTemplate, {
      method: "POST",
      headers: plan.uploadHeaders,
    });
    if (!upload.ok) {
      const status = mapMetaPublishStatus({ httpStatus: upload.status, graphErrorCode: upload.graphErrorCode });
      await admin.from("publish_jobs").update({
        publish_status: status,
        error_code: "graph_upload_failed",
        error_message_sanitized: sanitizeMetaError(upload.graphErrorMessage || "upload_failed"),
      }).eq("id", publishJobId);
      return json(status === "token_expired" ? 401 : 502, {
        error: "Meta could not ingest the video",
        code: "graph_upload_failed",
        publishJobId,
      });
    }

    // Step 3 — finish + publish (Page publishing is implicitly public).
    const finish = await metaGraphRequest(fetchImpl, facebookReelFinishUrl(ownerAccountId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildFacebookReelFinishBody(token, videoId, description)),
    });
    if (!finish.ok) {
      const status = mapMetaPublishStatus({ httpStatus: finish.status, graphErrorCode: finish.graphErrorCode });
      await admin.from("publish_jobs").update({
        publish_status: status,
        error_code: "graph_finish_failed",
        error_message_sanitized: sanitizeMetaError(finish.graphErrorMessage || "finish_failed"),
      }).eq("id", publishJobId);
      return json(status === "token_expired" ? 401 : 502, {
        error: "Meta publish did not complete",
        code: "graph_finish_failed",
        publishJobId,
      });
    }

    // Permalink is best-effort; never invented.
    let permalink: string | null = null;
    try {
      const meta = await metaGraphRequest(fetchImpl, `${GRAPH}/${encodeURIComponent(videoId)}?fields=permalink_url`, {
        method: "GET",
        headers: { Authorization: `OAuth ${token}` },
      });
      if (meta.ok && meta.body?.permalink_url) permalink = String(meta.body.permalink_url);
    } catch {
      permalink = null;
    }

    await admin.from("publish_jobs").update({
      publish_status: "published",
      platform_publish_id: videoId,
      platform_post_id: videoId,
      platform_post_url: permalink,
      published_at: new Date().toISOString(),
      error_code: null,
      error_message_sanitized: null,
    }).eq("id", publishJobId);

    return json(200, {
      publishJobId,
      platform: "facebook",
      publish_status: "published",
      platform_post_id: videoId,
      platform_post_url: permalink,
    });
  }

  // ------------------------------------------------------------ Instagram -- //
  if (platform === "instagram") {
    if (!ownerAccountId) {
      await admin.from("publish_jobs").update({
        publish_status: "failed",
        error_code: "no_ig_professional_account",
        error_message_sanitized: "Instagram professional account id missing on the connected account",
      }).eq("id", publishJobId);
      return json(422, {
        error: metaErrorText("no_ig_professional_account"),
        code: "no_ig_professional_account",
        publishJobId,
      });
    }

    // Step 1 — create the REELS container from the public URL.
    const container = await metaGraphRequest(fetchImpl, instagramContainerUrl(ownerAccountId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildInstagramContainerBody(token, videoUrl, description)),
    });
    const containerId = container.body?.id ? String(container.body.id) : "";
    if (!container.ok || !containerId) {
      const status = mapMetaPublishStatus({ httpStatus: container.status, graphErrorCode: container.graphErrorCode });
      await admin.from("publish_jobs").update({
        publish_status: status,
        error_code: "graph_container_failed",
        error_message_sanitized: sanitizeMetaError(container.graphErrorMessage || "container_failed"),
      }).eq("id", publishJobId);
      return json(status === "token_expired" ? 401 : 502, {
        error: "Instagram container could not be created",
        code: "graph_container_failed",
        publishJobId,
      });
    }

    // Step 2 — bounded poll for processing eligibility.
    let phase = "poll";
    let lastStatus = "IN_PROGRESS";
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      const st = await metaGraphRequest(fetchImpl, instagramStatusUrl(containerId), {
        method: "GET",
        headers: { Authorization: `OAuth ${token}` },
      });
      lastStatus = String(st.body?.status_code || "");
      phase = instagramStatusToPhase(lastStatus);
      if (phase !== "poll") break;
    }

    if (phase === "poll") {
      // Still processing: persist honestly and let the UI poll later.
      await admin.from("publish_jobs").update({
        publish_status: "processing",
        platform_publish_id: containerId,
        error_code: null,
        error_message_sanitized: null,
      }).eq("id", publishJobId);
      return json(202, {
        publishJobId,
        platform: "instagram",
        publish_status: "processing",
        container_id: containerId,
        container_status: lastStatus,
      });
    }

    if (phase === "failed") {
      await admin.from("publish_jobs").update({
        publish_status: "failed",
        platform_publish_id: containerId,
        error_code: "container_" + lastStatus.toLowerCase(),
        error_message_sanitized: sanitizeMetaError(`container_${lastStatus}`),
      }).eq("id", publishJobId);
      return json(502, {
        error: "Instagram container failed to process",
        code: "graph_container_failed",
        publishJobId,
        container_status: lastStatus,
      });
    }

    // Step 3 — publish the container.
    const publishRes = await metaGraphRequest(fetchImpl, instagramPublishUrl(ownerAccountId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildInstagramPublishBody(token, containerId)),
    });
    const mediaId = publishRes.body?.id ? String(publishRes.body.id) : "";
    if (!publishRes.ok || !mediaId) {
      const status = mapMetaPublishStatus({ httpStatus: publishRes.status, graphErrorCode: publishRes.graphErrorCode });
      await admin.from("publish_jobs").update({
        publish_status: status,
        platform_publish_id: containerId,
        error_code: "graph_publish_failed",
        error_message_sanitized: sanitizeMetaError(publishRes.graphErrorMessage || "publish_failed"),
      }).eq("id", publishJobId);
      return json(status === "token_expired" ? 401 : 502, {
        error: "Instagram publish did not complete",
        code: "graph_publish_failed",
        publishJobId,
      });
    }

    // Permalink is best-effort; never invented.
    let permalink: string | null = null;
    try {
      const meta = await metaGraphRequest(fetchImpl, `${GRAPH}/${encodeURIComponent(mediaId)}?fields=permalink`, {
        method: "GET",
        headers: { Authorization: `OAuth ${token}` },
      });
      if (meta.ok && meta.body?.permalink) permalink = String(meta.body.permalink);
    } catch {
      permalink = null;
    }

    await admin.from("publish_jobs").update({
      publish_status: "published",
      platform_publish_id: containerId,
      platform_post_id: mediaId,
      platform_post_url: permalink,
      published_at: new Date().toISOString(),
      error_code: null,
      error_message_sanitized: null,
    }).eq("id", publishJobId);

    return json(200, {
      publishJobId,
      platform: "instagram",
      publish_status: "published",
      platform_post_id: mediaId,
      platform_post_url: permalink,
    });
  }

  return json(400, { error: "Unsupported platform", code: "bad_platform" });
});
