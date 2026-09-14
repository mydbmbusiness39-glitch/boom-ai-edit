import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken, loadKeyFromEnv } from "../_shared/social_token_crypto.ts";
import {
  FACEBOOK_OAUTH_DIALOG,
  GRAPH_VERSION,
  META_SCOPES,
  META_SCOPE_LIST,
  decideMetaLink,
  decideMetaOAuthStart,
  missingPermissions,
  normalizeScopes,
  safeAccount,
} from "../_shared/meta_guards.ts";

/**
 * Gate #78 Meta OAuth — ONE Facebook Login consent covers Facebook Pages and the
 * Instagram professional account linked to them.
 *
 * Guarantees:
 *  - JWT required; the OAuth state row is bound to the authenticated user and
 *    re-checked on callback (a state minted by another user is rejected).
 *  - PKCE (S256) on the authorization-code flow.
 *  - Tokens are encrypted with the shared social token crypto and are NEVER
 *    returned to the browser.
 *  - Fails closed: missing app credentials, missing permissions, no Page, and no
 *    linked Instagram professional account each produce an explicit code — we
 *    never persist a half-connected or synthetic account row.
 */

const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

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

/** Only ever persisted/returned metadata — no token material. */
const SAFE_COLS =
  "id,user_id,platform,platform_account_id,platform_username,display_name,token_expires_at,scopes,status,created_at,updated_at,revoked_at";

async function upsertAccount(
  admin: ReturnType<typeof createClient>,
  row: Record<string, unknown>,
) {
  const platform = String(row.platform);
  // Same NULL-dedupe discipline as youtube-oauth: platform_account_id can be
  // NULL and a NULL never satisfies ON CONFLICT, so select-then-update in place.
  // Prefer an exact platform_account_id match, else the user's single row.
  const { data: exact } = await admin
    .from("social_accounts")
    .select("id")
    .eq("user_id", row.user_id as string)
    .eq("platform", platform)
    .eq("platform_account_id", String(row.platform_account_id || ""))
    .limit(1)
    .maybeSingle();

  let targetId: string | undefined = exact?.id;
  if (!targetId) {
    const { data: anyRow } = await admin
      .from("social_accounts")
      .select("id")
      .eq("user_id", row.user_id as string)
      .eq("platform", platform)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    targetId = anyRow?.id;
  }

  if (targetId) {
    const { data, error } = await admin
      .from("social_accounts")
      .update(row)
      .eq("id", targetId)
      .eq("user_id", row.user_id as string)
      .select(SAFE_COLS)
      .maybeSingle();
    return { saved: (data as Record<string, unknown> | null) ?? null, code: error ? String(error.code || "persist_failed") : null };
  }
  const { data, error } = await admin
    .from("social_accounts")
    .insert(row)
    .select(SAFE_COLS)
    .maybeSingle();
  return { saved: (data as Record<string, unknown> | null) ?? null, code: error ? String(error.code || "persist_failed") : null };
}

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

  const appId = envFirst("META_APP_ID", "META_CLIENT_ID", "FACEBOOK_APP_ID");
  const appSecret = envFirst("META_APP_SECRET", "META_CLIENT_SECRET", "FACEBOOK_APP_SECRET");
  const hasMetaCreds = Boolean(appId && appSecret);
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
      .select(SAFE_COLS)
      .eq("user_id", user.id)
      .in("platform", ["facebook", "instagram"]);
    return json(200, {
      configured: hasMetaCreds,
      requiredScopes: META_SCOPE_LIST,
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
    await admin
      .from("social_accounts")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        access_token_encrypted: null,
        refresh_token_encrypted: null,
      })
      .eq("id", accountId)
      .eq("user_id", user.id);
    return json(200, { revoked: true, id: accountId });
  }

  if (action === "start") {
    const decision = decideMetaOAuthStart({ user: { id: user.id }, hasMetaCreds });
    if (decision.status !== 200) {
      return json(decision.status, {
        error: decision.code === "oauth_not_configured"
          ? "Meta app credentials are not configured"
          : "OAuth start blocked",
        code: decision.code,
      });
    }
    const redirectUri = String(
      body.redirectUri || `${Deno.env.get("PUBLIC_APP_URL") || ""}/meta-oauth`,
    );
    const state = randomVerifier();
    const code_verifier = randomVerifier();
    const code_challenge = await s256(code_verifier);
    const { error: stErr } = await admin.from("social_oauth_states").insert({
      state,
      user_id: user.id,
      platform: "meta",
      code_verifier,
    });
    if (stErr) return json(500, { error: "Failed to persist OAuth state", code: "state_persist_failed" });

    const params = new URLSearchParams({
      client_id: appId as string,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      // ONE consent for both permission sets.
      scope: META_SCOPES,
      code_challenge,
      code_challenge_method: "S256",
    });
    return json(200, { authUrl: `${FACEBOOK_OAUTH_DIALOG}?${params.toString()}` });
  }

  if (action === "callback") {
    const start = decideMetaOAuthStart({ user: { id: user.id }, hasMetaCreds });
    if (start.status !== 200) {
      return json(start.status, {
        error: "Meta app credentials are not configured",
        code: start.code,
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
    if (!st || st.user_id !== user.id) {
      return json(403, { error: "Invalid OAuth state", code: "state_mismatch" });
    }
    if (new Date(st.expires_at).getTime() < Date.now()) {
      return json(401, { error: "OAuth state expired", code: "state_expired" });
    }
    await admin.from("social_oauth_states").delete().eq("state", state);

    // 1) authorization code -> short-lived user token (with PKCE verifier)
    const tokenParams = new URLSearchParams({
      client_id: appId as string,
      client_secret: appSecret as string,
      redirect_uri: redirectUri,
      code,
      code_verifier: st.code_verifier,
    });
    const tokenRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${tokenParams.toString()}`);
    const tokenJson = await tokenRes.json().catch(() => ({}));
    const shortToken = tokenJson?.access_token;
    if (!tokenRes.ok || !shortToken) {
      return json(502, { error: "Meta token exchange failed", code: "token_exchange_failed" });
    }

    // 2) short-lived -> long-lived user token
    const longParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId as string,
      client_secret: appSecret as string,
      fb_exchange_token: String(shortToken),
    });
    const longRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${longParams.toString()}`);
    const longJson = await longRes.json().catch(() => ({}));
    const userToken = longJson?.access_token || shortToken;
    const expiresIn = Number(longJson?.expires_in || 0);

    // 3) granted permissions (authoritative, not what we merely asked for)
    let grantedScopes: string[] = [];
    try {
      const permRes = await fetch(`${GRAPH}/me/permissions?access_token=${encodeURIComponent(String(userToken))}`);
      const permJson = await permRes.json().catch(() => ({}));
      grantedScopes = normalizeScopes(
        Array.isArray(permJson?.data)
          ? permJson.data.filter((p: Record<string, unknown>) => p.status === "granted").map((p: Record<string, unknown>) => p.permission)
          : [],
      );
    } catch {
      grantedScopes = [];
    }

    // 4) Pages + their Page tokens + any linked IG professional account
    let pages: Array<Record<string, unknown>> = [];
    try {
      const accountsUrl =
        `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(String(userToken))}`;
      const accRes = await fetch(accountsUrl);
      const accJson = await accRes.json().catch(() => ({}));
      pages = Array.isArray(accJson?.data) ? accJson.data : [];
    } catch {
      pages = [];
    }

    const requestedPageId = body.pageId ? String(body.pageId) : null;
    const selectedPage = requestedPageId
      ? pages.find((p) => String(p.id) === requestedPageId)
      : pages[0];

    const ig = (selectedPage?.instagram_business_account || null) as Record<string, unknown> | null;
    const igId = ig?.id ? String(ig.id) : null;

    const link = decideMetaLink({
      user: { id: user.id },
      hasMetaCreds,
      pages: pages as Array<{ id?: string; access_token?: string }>,
      pageId: requestedPageId,
      instagramBusinessAccountId: igId,
      grantedScopes,
    });

    if (link.status !== 200) {
      // Fail closed: nothing is persisted on a blocked link.
      return json(link.status, {
        error: link.code === "missing_permissions"
          ? "Required Meta permissions were not granted"
          : link.code === "no_page"
          ? "No Facebook Page was found for this account"
          : link.code === "page_forbidden"
          ? "That Facebook Page is not available to this account"
          : "Meta link blocked",
        code: link.code,
        missing: missingPermissions(grantedScopes),
      });
    }

    const encKey = await loadKeyFromEnv(cryptoKeyName);
    if (!encKey) {
      return json(500, { error: "Token encryption key missing", code: "encryption_unconfigured" });
    }

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const pageToken = selectedPage?.access_token ? String(selectedPage.access_token) : String(userToken);
    const pageTokenEnc = await encryptToken(pageToken, encKey);

    const created: Record<string, unknown>[] = [];

    const fbSave = await upsertAccount(admin, {
      user_id: user.id,
      platform: "facebook",
      platform_account_id: String(selectedPage?.id || "") || null,
      platform_username: selectedPage?.name ? String(selectedPage.name) : null,
      display_name: selectedPage?.name ? String(selectedPage.name) : null,
      access_token_encrypted: pageTokenEnc,
      refresh_token_encrypted: null,
      token_expires_at: expiresAt,
      scopes: grantedScopes.length ? grantedScopes : META_SCOPE_LIST,
      status: "active",
      revoked_at: null,
    });
    if (fbSave.code) {
      if (fbSave.code === "23505") return json(409, { error: "This Facebook Page is already connected", code: "duplicate_account" });
      return json(500, { error: "Failed to store Facebook account", code: "persist_failed" });
    }
    created.push(safeAccount(fbSave.saved) as Record<string, unknown>);

    // Instagram: only when a professional account is genuinely linked. No Page
    // linkage -> NO instagram row (never a synthetic connected state).
    let instagram: Record<string, unknown> | null = null;
    let instagramCode = "no_ig_professional_account";
    if (link.canCreateInstagram && igId) {
      const igUsername = ig?.username ? String(ig.username) : null;
      const igSave = await upsertAccount(admin, {
        user_id: user.id,
        platform: "instagram",
        platform_account_id: igId,
        platform_username: igUsername,
        display_name: igUsername,
        // Publishing to an IG professional account uses the linked Page token.
        access_token_encrypted: pageTokenEnc,
        refresh_token_encrypted: null,
        token_expires_at: expiresAt,
        scopes: grantedScopes.length ? grantedScopes : META_SCOPE_LIST,
        status: "active",
        revoked_at: null,
      });
      if (igSave.code) {
        return json(200, {
          accounts: created,
          instagram: null,
          code: "instagram_persist_failed",
        });
      }
      instagram = safeAccount(igSave.saved) as Record<string, unknown>;
      instagramCode = "ok";
    }

    return json(200, {
      accounts: created,
      instagram,
      code: instagramCode,
      page: { id: selectedPage?.id ? String(selectedPage.id) : null, name: selectedPage?.name ? String(selectedPage.name) : null },
    });
  }

  return json(400, { error: "Unknown action", code: "bad_action" });
});
