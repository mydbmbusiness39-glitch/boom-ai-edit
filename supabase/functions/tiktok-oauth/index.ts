import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, loadKeyFromEnv } from "../_shared/social_token_crypto.ts";
import { decideOAuthStart, safeAccount } from "../_shared/tiktok_guards.ts";

const TIKTOK_AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER = "https://open.tiktokapis.com/v2/user/info/";
const SCOPES = "user.info.basic,video.publish,video.upload";

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

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

  const clientKey = envFirst("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_ID");
  const clientSecret = envFirst("TIKTOK_CLIENT_SECRET");
  const hasTikTokCreds = Boolean(clientKey && clientSecret);
  const cryptoKeyName = envFirst("SOCIAL_TOKEN_ENCRYPTION_KEY", "SOCIAL_TOKEN_KEY");

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  const action = String(body.action || (body.code ? "callback" : "start"));
  const admin = createClient(supabaseUrl, serviceKey);

  if (action === "status" || action === "list") {
    const { data: rows } = await admin
      .from("social_accounts")
      .select("id,user_id,platform,platform_account_id,platform_username,display_name,token_expires_at,scopes,status,created_at,updated_at,revoked_at")
      .eq("user_id", user.id)
      .eq("platform", "tiktok");
    return json(200, {
      configured: hasTikTokCreds,
      accounts: (rows || []).map((r) => safeAccount(r as Record<string, unknown>)),
    });
  }

  if (action === "revoke") {
    const accountId = String(body.accountId || "");
    const { data: row } = await admin
      .from("social_accounts")
      .select("id,user_id")
      .eq("id", accountId)
      .maybeSingle();
    if (!row || row.user_id !== user.id) return json(403, { error: "Account not found", code: "account_forbidden" });
    await admin.from("social_accounts").update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      access_token_encrypted: null,
      refresh_token_encrypted: null,
    }).eq("id", accountId).eq("user_id", user.id);
    return json(200, { revoked: true, id: accountId });
  }

  if (action === "start") {
    const decision = decideOAuthStart({ user: { id: user.id }, hasTikTokCreds });
    if (decision.status !== 200) {
      return json(decision.status, {
        error: decision.code === "oauth_not_configured"
          ? "TikTok developer app is not configured"
          : "OAuth start blocked",
        code: decision.code,
      });
    }
    const redirectUri = String(body.redirectUri || `${Deno.env.get("PUBLIC_APP_URL") || ""}/tiktok-oauth`);
    const state = randomVerifier();
    const code_verifier = randomVerifier();
    const code_challenge = await s256(code_verifier);
    const { error: stErr } = await admin.from("social_oauth_states").insert({
      state,
      user_id: user.id,
      platform: "tiktok",
      code_verifier,
    });
    if (stErr) return json(500, { error: "Failed to persist OAuth state", code: "state_persist_failed" });
    const params = new URLSearchParams({
      client_key: clientKey as string,
      response_type: "code",
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      code_challenge,
      code_challenge_method: "S256",
    });
    return json(200, { authUrl: `${TIKTOK_AUTHORIZE}?${params.toString()}` });
  }

  if (action === "callback") {
    const decision = decideOAuthStart({ user: { id: user.id }, hasTikTokCreds });
    if (decision.status !== 200) {
      return json(decision.status, {
        error: "TikTok developer app is not configured",
        code: decision.code,
      });
    }
    const code = String(body.code || "");
    const state = String(body.state || "");
    const redirectUri = String(body.redirectUri || "");
    if (!code || !state) return json(400, { error: "Missing code or state", code: "bad_callback" });
    const { data: st } = await admin
      .from("social_oauth_states")
      .select("*")
      .eq("state", state)
      .maybeSingle();
    if (!st || st.user_id !== user.id) return json(403, { error: "Invalid OAuth state", code: "state_mismatch" });
    if (new Date(st.expires_at).getTime() < Date.now()) {
      return json(401, { error: "OAuth state expired", code: "state_expired" });
    }
    await admin.from("social_oauth_states").delete().eq("state", state);

    const tokenRes = await fetch(TIKTOK_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey as string,
        client_secret: clientSecret as string,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: st.code_verifier,
      }),
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    const inner = tokenJson.data || tokenJson;
    const access = inner.access_token;
    const refresh = inner.refresh_token;
    if (!tokenRes.ok || !access) {
      return json(502, { error: "TikTok token exchange failed", code: "token_exchange_failed" });
    }
    const encKey = await loadKeyFromEnv(cryptoKeyName);
    if (!encKey) return json(500, { error: "Token encryption key missing", code: "encryption_unconfigured" });
    const accessEnc = await encryptToken(String(access), encKey);
    const refreshEnc = refresh ? await encryptToken(String(refresh), encKey) : null;
    const expiresIn = Number(inner.expires_in || 86400);
    const refreshExpiresIn = Number(inner.refresh_expires_in || 0);

    let username = "";
    let display = "";
    let openId = inner.open_id || "";
    try {
      const ures = await fetch(`${TIKTOK_USER}?fields=open_id,display_name,username`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      const ujson = await ures.json().catch(() => ({}));
      const u = ujson.data?.user || ujson.data || {};
      username = u.username || "";
      display = u.display_name || username;
      openId = u.open_id || openId;
    } catch {
      // Profile fetch is best-effort; tokens already encrypted for persist.
    }

    const row = {
      user_id: user.id,
      platform: "tiktok",
      platform_account_id: openId || null,
      platform_username: username || null,
      display_name: display || null,
      access_token_encrypted: accessEnc,
      refresh_token_encrypted: refreshEnc,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      refresh_expires_at: refreshExpiresIn ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString() : null,
      scopes: SCOPES.split(","),
      status: "active",
      revoked_at: null,
    };
    const { data: saved, error: saveErr } = await admin
      .from("social_accounts")
      .upsert(row, { onConflict: "user_id,platform,platform_account_id" })
      .select("id,user_id,platform,platform_account_id,platform_username,display_name,token_expires_at,scopes,status,created_at,updated_at,revoked_at")
      .maybeSingle();
    if (saveErr) return json(500, { error: "Failed to store account", code: "persist_failed" });
    return json(200, { account: safeAccount(saved as Record<string, unknown>) });
  }

  return json(400, { error: "Unknown action", code: "bad_action" });
});
