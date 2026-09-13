import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken, loadKeyFromEnv } from "../_shared/social_token_crypto.ts";
import {
  assertApproved,
  decideYouTubePublish,
  mapYouTubePrivacy,
  safeAccount,
  sanitizeYouTubeError,
} from "../_shared/youtube_guards.ts";
import { buildRefreshTokenRequest } from "../_shared/youtube_upload_protocol.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "No authorization header", code: "unauthenticated" });

  const userSb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
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
  const hasGoogleCreds = Boolean(
    envFirst("GOOGLE_OAUTH_CLIENT_ID", "YOUTUBE_CLIENT_ID") &&
      envFirst("GOOGLE_OAUTH_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET"),
  );

  if (action === "status") {
    const publishJobId = String(body.publishJobId || "");
    const { data: row } = await admin.from("publish_jobs").select("*").eq("id", publishJobId).maybeSingle();
    if (!row || row.user_id !== user.id) return json(403, { error: "Not found", code: "job_forbidden" });
    const { data: account } = await admin.from("social_accounts").select("id,user_id,platform,platform_username,display_name,status").eq("id", row.social_account_id).maybeSingle();
    return json(200, { publishJob: row, account: safeAccount(account as Record<string, unknown>) });
  }

  const boomJobId = String(body.boomJobId || "");
  const socialAccountId = String(body.socialAccountId || "");
  const title = typeof body.title === "string" ? body.title : "";
  const description = typeof body.description === "string"
    ? body.description
    : (typeof body.caption === "string" ? body.caption : "");
  const privacyMapped = mapYouTubePrivacy(typeof body.privacyLevel === "string" ? body.privacyLevel : "private");
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

  const decision = decideYouTubePublish({
    user: { id: user.id },
    entitlement: { social_publish: entitlements.social_publish === true },
    approvalStatus,
    account: account as any,
    job: job as any,
    existing,
    hasGoogleCreds,
  });

  if (decision.status !== 200) {
    return json(decision.status, {
      error: decision.code === "not_approved"
        ? "Owner approval is required before publishing."
        : decision.code === "oauth_not_configured"
        ? "Google Cloud OAuth is not configured"
        : decision.code === "duplicate_publish"
        ? "This video is already queued or published to that account."
        : decision.code === "token_expired"
        ? "YouTube token expired. Reconnect the account."
        : decision.code === "revoked"
        ? "YouTube permission was revoked."
        : decision.code === "unsupported_media"
        ? "Completed Boom MP4 is required."
        : "Publish blocked",
      code: decision.code,
    });
  }

  if (!privacyMapped) {
    return json(400, { error: "YouTube privacy must be private, unlisted, or public.", code: "bad_privacy" });
  }

  try {
    assertApproved(approvalStatus);
  } catch {
    return json(403, { error: "Owner approval is required before publishing.", code: "not_approved" });
  }

  const videoUrl = job.output_url as string;

  const { data: inserted, error: insErr } = await admin.from("publish_jobs").insert({
    user_id: user.id,
    social_account_id: socialAccountId,
    boom_job_id: boomJobId,
    platform: "youtube",
    title: title || null,
    caption: description || null,
    description: description || null,
    privacy_level: privacyMapped,
    approval_status: "approved",
    approved_at: new Date().toISOString(),
    publish_status: "pending",
  }).select("*").maybeSingle();

  if (insErr) {
    if (String(insErr.code) === "23505" || /duplicate/i.test(insErr.message || "")) {
      return json(409, { error: "This video is already queued or published to that account.", code: "duplicate_publish" });
    }
    return json(500, { error: "Failed to create publish job", code: "persist_failed" });
  }

  const encKey = await loadKeyFromEnv(envFirst("SOCIAL_TOKEN_ENCRYPTION_KEY", "SOCIAL_TOKEN_KEY"));
  if (!encKey || !account.access_token_encrypted) {
    await admin.from("publish_jobs").update({
      publish_status: "failed",
      error_code: "encryption_unconfigured",
      error_message_sanitized: "Token encryption key missing",
    }).eq("id", inserted.id);
    return json(500, { error: "Token encryption key missing", code: "encryption_unconfigured" });
  }

  let bearer = await decryptToken(account.access_token_encrypted, encKey);
  const clientId = envFirst("GOOGLE_OAUTH_CLIENT_ID", "YOUTUBE_CLIENT_ID");
  const clientSecret = envFirst("GOOGLE_OAUTH_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET");
  const exp = account.token_expires_at ? Date.parse(account.token_expires_at) : 0;
  if (exp && exp < Date.now() + 60_000 && account.refresh_token_encrypted && clientId && clientSecret) {
    const refreshPlain = await decryptToken(account.refresh_token_encrypted, encKey);
    const refreshReq = buildRefreshTokenRequest({
      clientId,
      clientSecret,
      refresh_token: refreshPlain,
    });
    const refRes = await fetch(refreshReq.url, {
      method: refreshReq.method,
      headers: refreshReq.headers,
      body: refreshReq.body,
    });
    const refJson = await refRes.json().catch(() => ({}));
    if (refJson.access_token) {
      bearer = refJson.access_token;
      await admin.from("social_accounts").update({
        access_token_encrypted: await encryptToken(String(refJson.access_token), encKey),
        refresh_token_encrypted: refJson.refresh_token
          ? await encryptToken(String(refJson.refresh_token), encKey)
          : account.refresh_token_encrypted,
        token_expires_at: new Date(Date.now() + Number(refJson.expires_in || 3600) * 1000).toISOString(),
        status: "active",
      }).eq("id", account.id);
    } else if (!refRes.ok) {
      await admin.from("publish_jobs").update({
        publish_status: "token_expired",
        error_code: "token_expired",
        error_message_sanitized: "YouTube refresh failed",
      }).eq("id", inserted.id);
      return json(401, { error: "YouTube token expired. Reconnect the account.", code: "token_expired", publishJobId: inserted.id });
    }
  }

  const workerUrl = envFirst("AI_WORKER_URL", "AI_Worker_URL");
  const workerKey = envFirst("AI_WORKER_API_KEY", "AI_WORKER_TOKEN", "AI_Worker_API_key");
  if (!workerUrl) {
    await admin.from("publish_jobs").update({
      publish_status: "failed",
      error_code: "worker_unconfigured",
      error_message_sanitized: "Upload worker URL missing",
    }).eq("id", inserted.id);
    return json(500, { error: "YouTube upload worker is not configured", code: "worker_unconfigured" });
  }

  await admin.from("publish_jobs").update({ publish_status: "uploading" }).eq("id", inserted.id);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (workerKey) headers.Authorization = `Bearer ${workerKey}`;

  let workerRes: Response;
  try {
    workerRes = await fetch(`${workerUrl.replace(/\/$/, "")}/social/youtube-upload`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        publish_job_id: inserted.id,
        video_url: videoUrl,
        title: title || "Boom Studio Short",
        description,
        privacy: privacyMapped,
        access_token: bearer,
      }),
    });
  } catch {
    await admin.from("publish_jobs").update({
      publish_status: "failed",
      error_code: "worker_unreachable",
      error_message_sanitized: "Upload worker unreachable",
    }).eq("id", inserted.id);
    return json(502, { error: "YouTube upload worker unreachable", code: "worker_unreachable", publishJobId: inserted.id });
  }

  const workerJson = await workerRes.json().catch(() => ({}));
  if (!workerRes.ok || !workerJson.video_id) {
    const mapped = workerRes.status === 401 ? "token_expired" : "failed";
    await admin.from("publish_jobs").update({
      publish_status: mapped,
      error_code: mapped === "token_expired" ? "token_expired" : "youtube_upload_failed",
      error_message_sanitized: sanitizeYouTubeError(JSON.stringify(workerJson.error || workerJson)),
    }).eq("id", inserted.id);
    return json(502, {
      error: "YouTube rejected the upload request.",
      code: mapped === "token_expired" ? "token_expired" : "publish_rejected",
      publishJobId: inserted.id,
    });
  }

  const videoId = String(workerJson.video_id);
  const { data: updated } = await admin.from("publish_jobs").update({
    publish_status: "published",
    platform_post_id: videoId,
    platform_publish_id: videoId,
    platform_post_url: `https://www.youtube.com/shorts/${videoId}`,
    published_at: new Date().toISOString(),
  }).eq("id", inserted.id).select("*").maybeSingle();

  return json(200, {
    publishJob: updated,
    account: safeAccount(account),
  });
});
