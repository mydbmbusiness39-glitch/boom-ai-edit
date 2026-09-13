import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken, loadKeyFromEnv } from "../_shared/social_token_crypto.ts";
import {
  assertApproved,
  decidePublish,
  mapTikTokStatus,
  safeAccount,
  sanitizeTikTokError,
} from "../_shared/tiktok_guards.ts";

const TIKTOK_INIT = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TIKTOK_STATUS = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
const TIKTOK_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";

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
  const hasTikTokCreds = Boolean(
    envFirst("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_ID") && envFirst("TIKTOK_CLIENT_SECRET"),
  );

  if (action === "status") {
    const publishJobId = String(body.publishJobId || "");
    const { data: row } = await admin.from("publish_jobs").select("*").eq("id", publishJobId).maybeSingle();
    if (!row || row.user_id !== user.id) return json(403, { error: "Not found", code: "job_forbidden" });
    if (!row.platform_publish_id || !hasTikTokCreds) {
      return json(200, { publishJob: row, account: null });
    }
    const { data: account } = await admin.from("social_accounts").select("*").eq("id", row.social_account_id).maybeSingle();
    if (!account || account.user_id !== user.id) return json(403, { error: "Account forbidden", code: "account_forbidden" });
    const encKey = await loadKeyFromEnv(envFirst("SOCIAL_TOKEN_ENCRYPTION_KEY", "SOCIAL_TOKEN_KEY"));
    if (!encKey || !account.access_token_encrypted) {
      return json(200, { publishJob: row });
    }
    const bearer = await decryptToken(account.access_token_encrypted, encKey);
    const stRes = await fetch(TIKTOK_STATUS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: row.platform_publish_id }),
    });
    const stJson = await stRes.json().catch(() => ({}));
    const mapped = mapTikTokStatus(stJson.data?.status);
    const postId = stJson.data?.publicaly_available_post_id?.[0] || stJson.data?.publicly_available_post_id?.[0] || null;
    const patch: Record<string, unknown> = {
      publish_status: mapped,
      error_message_sanitized: mapped === "failed" ? sanitizeTikTokError(JSON.stringify(stJson.error || stJson)) : null,
    };
    if (postId) {
      patch.platform_post_id = String(postId);
      patch.platform_post_url = `https://www.tiktok.com/@${account.platform_username || "user"}/video/${postId}`;
      patch.published_at = new Date().toISOString();
    }
    const { data: updated } = await admin.from("publish_jobs").update(patch).eq("id", row.id).select("*").maybeSingle();
    return json(200, { publishJob: updated || row, account: safeAccount(account) });
  }

  const boomJobId = String(body.boomJobId || "");
  const socialAccountId = String(body.socialAccountId || "");
  const title = typeof body.title === "string" ? body.title : "";
  const caption = typeof body.caption === "string" ? body.caption : "";
  const hashtags = typeof body.hashtags === "string" ? body.hashtags : "";
  const privacyLevel = typeof body.privacyLevel === "string" ? body.privacyLevel : "SELF_ONLY";
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

  const decision = decidePublish({
    user: { id: user.id },
    entitlement: { social_publish: entitlements.social_publish === true },
    approvalStatus,
    account: account as any,
    job: job as any,
    existing,
    hasTikTokCreds,
  });

  if (decision.status !== 200) {
    return json(decision.status, {
      error: decision.code === "not_approved"
        ? "Owner approval is required before publishing."
        : decision.code === "oauth_not_configured"
        ? "TikTok developer app is not configured"
        : decision.code === "duplicate_publish"
        ? "This video is already queued or published to that account."
        : decision.code === "token_expired"
        ? "TikTok token expired. Reconnect the account."
        : decision.code === "revoked"
        ? "TikTok permission was revoked."
        : decision.code === "unsupported_media"
        ? "Completed Boom MP4 is required."
        : "Publish blocked",
      code: decision.code,
    });
  }

  try {
    assertApproved(approvalStatus);
  } catch {
    return json(403, { error: "Owner approval is required before publishing.", code: "not_approved" });
  }

  const videoUrl = job.output_url as string;
  const combinedTitle = [title || caption, hashtags].filter(Boolean).join(" ").slice(0, 2200);

  const { data: inserted, error: insErr } = await admin.from("publish_jobs").insert({
    user_id: user.id,
    social_account_id: socialAccountId,
    boom_job_id: boomJobId,
    platform: "tiktok",
    title: title || null,
    caption: caption || null,
    hashtags: hashtags || null,
    privacy_level: privacyLevel,
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
  const clientKey = envFirst("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_ID");
  const clientSecret = envFirst("TIKTOK_CLIENT_SECRET");
  const exp = account.token_expires_at ? Date.parse(account.token_expires_at) : 0;
  if (exp && exp < Date.now() + 60_000 && account.refresh_token_encrypted && clientKey && clientSecret) {
    const refreshPlain = await decryptToken(account.refresh_token_encrypted, encKey);
    const refRes = await fetch(TIKTOK_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshPlain,
      }),
    });
    const refJson = await refRes.json().catch(() => ({}));
    const inner = refJson.data || refJson;
    if (inner.access_token) {
      bearer = inner.access_token;
      await admin.from("social_accounts").update({
        access_token_encrypted: await encryptToken(String(inner.access_token), encKey),
        refresh_token_encrypted: inner.refresh_token ? await encryptToken(String(inner.refresh_token), encKey) : account.refresh_token_encrypted,
        token_expires_at: new Date(Date.now() + Number(inner.expires_in || 86400) * 1000).toISOString(),
        status: "active",
      }).eq("id", account.id);
    }
  }

  const initRes = await fetch(TIKTOK_INIT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: combinedTitle,
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });
  const initJson = await initRes.json().catch(() => ({}));
  if (!initRes.ok || !initJson.data?.publish_id) {
    const sanitized = sanitizeTikTokError(JSON.stringify(initJson.error || initJson));
    await admin.from("publish_jobs").update({
      publish_status: "failed",
      error_code: "tiktok_init_failed",
      error_message_sanitized: sanitized,
    }).eq("id", inserted.id);
    return json(502, { error: "TikTok rejected the publish request.", code: "publish_rejected", publishJobId: inserted.id });
  }

  const { data: updated } = await admin.from("publish_jobs").update({
    publish_status: "processing",
    platform_publish_id: initJson.data.publish_id,
  }).eq("id", inserted.id).select("*").maybeSingle();

  return json(200, {
    publishJob: updated,
    account: safeAccount(account),
  });
});
