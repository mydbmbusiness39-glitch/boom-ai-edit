import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, loadKeyFromEnv } from "../_shared/social_token_crypto.ts";
import { decideYouTubeOAuthStart, safeAccount } from "../_shared/youtube_guards.ts";

const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const YT_CHANNELS = "https://www.googleapis.com/youtube/v3/channels?part=snippet,id&mine=true";
const SCOPES = "https://www.googleapis.com/auth/youtube.upload";

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

  const clientId = envFirst("GOOGLE_OAUTH_CLIENT_ID", "YOUTUBE_CLIENT_ID");
  const clientSecret = envFirst("GOOGLE_OAUTH_CLIENT_SECRET", "YOUTUBE_CLIENT_SECRET");
  const hasGoogleCreds = Boolean(clientId && clientSecret);
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
      .eq("platform", "youtube");
    return json(200, {
      configured: hasGoogleCreds,
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
    const decision = decideYouTubeOAuthStart({ user: { id: user.id }, hasGoogleCreds });
    if (decision.status !== 200) {
      return json(decision.status, {
        error: decision.code === "oauth_not_configured"
          ? "Google Cloud OAuth is not configured"
          : "OAuth start blocked",
        code: decision.code,
      });
    }
    const redirectUri = String(body.redirectUri || `${Deno.env.get("PUBLIC_APP_URL") || ""}/youtube-oauth`);
    const state = randomVerifier();
    const code_verifier = randomVerifier();
    const code_challenge = await s256(code_verifier);
    const { error: stErr } = await admin.from("social_oauth_states").insert({
      state,
      user_id: user.id,
      platform: "youtube",
      code_verifier,
    });
    if (stErr) return json(500, { error: "Failed to persist OAuth state", code: "state_persist_failed" });
    const params = new URLSearchParams({
      client_id: clientId as string,
      response_type: "code",
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      code_challenge,
      code_challenge_method: "S256",
    });
    return json(200, { authUrl: `${GOOGLE_AUTHORIZE}?${params.toString()}` });
  }

  if (action === "callback") {
    const decision = decideYouTubeOAuthStart({ user: { id: user.id }, hasGoogleCreds });
    if (decision.status !== 200) {
      return json(decision.status, {
        error: "Google Cloud OAuth is not configured",
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

    const tokenRes = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId as string,
        client_secret: clientSecret as string,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: st.code_verifier,
      }),
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    const access = tokenJson.access_token;
    const refresh = tokenJson.refresh_token;
    if (!tokenRes.ok || !access) {
      return json(502, { error: "Google token exchange failed", code: "token_exchange_failed" });
    }
    const encKey = await loadKeyFromEnv(cryptoKeyName);
    if (!encKey) return json(500, { error: "Token encryption key missing", code: "encryption_unconfigured" });
    const accessEnc = await encryptToken(String(access), encKey);
    const refreshEnc = refresh ? await encryptToken(String(refresh), encKey) : null;
    const expiresIn = Number(tokenJson.expires_in || 3600);

    let channelId = "";
    let username = "";
    let display = "";
    try {
      const ures = await fetch(YT_CHANNELS, {
        headers: { Authorization: `Bearer ${access}` },
      });
      const ujson = await ures.json().catch(() => ({}));
      const ch = Array.isArray(ujson.items) ? ujson.items[0] : null;
      channelId = ch?.id || "";
      display = ch?.snippet?.title || "";
      username = ch?.snippet?.customUrl || display;
    } catch {
      // Profile fetch is best-effort; tokens already encrypted for persist.
    }

    const row = {
      user_id: user.id,
      platform: "youtube",
      platform_account_id: channelId || null,
      platform_username: username || null,
      display_name: display || null,
      access_token_encrypted: accessEnc,
      refresh_token_encrypted: refreshEnc,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes: SCOPES.split(" "),
      status: "active",
      revoked_at: null,
    };
    // NULL-dedupe guard: platform_account_id can be NULL (channel metadata needs
    // youtube.readonly, which is not requested yet). A NULL never satisfies
    // ON CONFLICT, so an upsert would insert a NEW row on every consent.
    // Update the existing user+platform row in place instead of duplicating it.
    const { data: existingAccount } = await admin
      .from("social_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "youtube")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const safeCols =
      "id,user_id,platform,platform_account_id,platform_username,display_name,token_expires_at,scopes,status,created_at,updated_at,revoked_at";
    let saved: Record<string, unknown> | null = null;
    let saveErrCode: string | null = null;
    if (existingAccount?.id) {
      const { data, error } = await admin
        .from("social_accounts")
        .update(row)
        .eq("id", existingAccount.id)
        .eq("user_id", user.id)
        .select(safeCols)
        .maybeSingle();
      saved = (data as Record<string, unknown> | null) ?? null;
      saveErrCode = error ? String(error.code || "persist_failed") : null;
    } else {
      const { data, error } = await admin
        .from("social_accounts")
        .insert(row)
        .select(safeCols)
        .maybeSingle();
      saved = (data as Record<string, unknown> | null) ?? null;
      saveErrCode = error ? String(error.code || "persist_failed") : null;
    }
    if (saveErrCode) {
      if (saveErrCode === "23505") {
        return json(409, { error: "This YouTube account is already connected", code: "duplicate_account" });
      }
      return json(500, { error: "Failed to store account", code: "persist_failed" });
    }
    return json(200, { account: safeAccount(saved) });
  }

  return json(400, { error: "Unknown action", code: "bad_action" });
});
