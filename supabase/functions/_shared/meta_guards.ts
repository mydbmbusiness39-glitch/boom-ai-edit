/**
 * Gate #78 Meta (Facebook Reels + Instagram Reels) guards.
 *
 * PURE functions only — no network, no Deno APIs, no side effects — so the whole
 * decision surface is unit-testable and cannot leak a token.
 *
 * Pinned Graph API version. Never interpolate a version string inline; Meta
 * deprecates versions on a schedule and an unpinned call is an outage waiting
 * to happen.
 */
export const GRAPH_VERSION = "v26.0";

export const GRAPH_HOST = "https://graph.facebook.com";
export const RUPLOAD_HOST = "https://rupload.facebook.com";
export const FACEBOOK_OAUTH_DIALOG =
  "https://www.facebook.com/v26.0/dialog/oauth";

/**
 * One Facebook Login consent covers both products.
 *  - pages_show_list / pages_read_engagement  -> enumerate Pages + read Page info
 *  - pages_manage_posts                       -> publish the Facebook Reel
 *  - instagram_basic / instagram_content_publish -> resolve + publish the IG Reel
 */
export const META_SCOPES_FACEBOOK = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
];
export const META_SCOPES_INSTAGRAM = [
  "instagram_basic",
  "instagram_content_publish",
];
export const META_SCOPE_LIST = [...META_SCOPES_FACEBOOK, ...META_SCOPES_INSTAGRAM];
export const META_SCOPES = META_SCOPE_LIST.join(",");

/** Facebook Page publishing has no privacy field — it is implicitly public. */
export const FACEBOOK_PRIVACY = "PUBLIC";
/** Instagram exposes no per-post privacy — store an explicit default marker. */
export const INSTAGRAM_PRIVACY = "PLATFORM_DEFAULT";

export type MetaPlatform = "facebook" | "instagram";

export type GuardUser = { id: string } | null;
export type GuardAccount = {
  user_id: string;
  status: string;
  platform?: string;
  token_expires_at?: string | null;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  platform_account_id?: string | null;
  platform_username?: string;
  display_name?: string | null;
  id?: string;
};
export type GuardJob = {
  user_id: string;
  status: string;
  output_url?: string | null;
};

export function isMetaPlatform(v: unknown): v is MetaPlatform {
  return v === "facebook" || v === "instagram";
}

/** Strip token ciphertext (and anything else non-safe) from a row before it
 *  can ever reach a response body. Copied contract from youtube_guards. */
export function safeAccount(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  const {
    access_token_encrypted: _a,
    refresh_token_encrypted: _r,
    ...rest
  } = row as Record<string, unknown>;
  return rest;
}

export function normalizeScopes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((s) => String(s));
  if (typeof raw === "string") return raw.split(/[,\s]+/).filter(Boolean);
  return [];
}

/** Missing-permission check against what Meta actually granted. */
export function missingPermissions(
  granted: unknown,
  required: string[] = META_SCOPE_LIST,
): string[] {
  const have = new Set(normalizeScopes(granted));
  return required.filter((p) => !have.has(p));
}

export function decideMetaOAuthStart(input: {
  user: GuardUser;
  hasMetaCreds: boolean;
}): { status: number; code?: string } {
  if (!input.user) return { status: 401, code: "unauthenticated" };
  if (!input.hasMetaCreds) return { status: 503, code: "oauth_not_configured" };
  return { status: 200 };
}

/**
 * Fail-closed link decision.
 *
 * The OAuth callback must NOT persist a half-connected state: a Meta app user
 * with no Page, or a Page with no linked Instagram professional account, has
 * nothing we can legitimately publish to. Each outcome is a distinct, explicit
 * code (never a silent partial success).
 */
export function decideMetaLink(input: {
  user: GuardUser;
  hasMetaCreds: boolean;
  pages: Array<{ id?: string; access_token?: string }> | null | undefined;
  pageId?: string | null;
  instagramBusinessAccountId?: string | null;
  grantedScopes: unknown;
}): { status: number; code: string; canCreateFacebook: boolean; canCreateInstagram: boolean } {
  if (!input.user) {
    return { status: 401, code: "unauthenticated", canCreateFacebook: false, canCreateInstagram: false };
  }
  if (!input.hasMetaCreds) {
    return { status: 503, code: "oauth_not_configured", canCreateFacebook: false, canCreateInstagram: false };
  }
  const missing = missingPermissions(input.grantedScopes);
  if (missing.length > 0) {
    return { status: 403, code: "missing_permissions", canCreateFacebook: false, canCreateInstagram: false };
  }
  const pages = Array.isArray(input.pages) ? input.pages : [];
  if (pages.length === 0) {
    return { status: 422, code: "no_page", canCreateFacebook: false, canCreateInstagram: false };
  }
  // No explicit pageId -> default to the account's first Page (the normal
  // callback path). An explicit pageId that is absent from the list is refused.
  const selected = input.pageId
    ? pages.find((p) => String(p.id) === String(input.pageId))
    : pages[0];
  if (!selected) {
    return { status: 403, code: "page_forbidden", canCreateFacebook: false, canCreateInstagram: false };
  }
  const canCreateInstagram = Boolean(input.instagramBusinessAccountId);
  return {
    status: 200,
    code: canCreateInstagram ? "ok" : "no_ig_professional_account",
    canCreateFacebook: Boolean(selected),
    canCreateInstagram,
  };
}

/**
 * Privacy mapping, per platform.
 *  - tiktok/youtube keep their existing vocabularies (handled elsewhere).
 *  - facebook: PUBLIC only. Anything else is refused rather than silently
 *    coerced, so a caller can never believe it selected a private audience.
 *  - instagram: single platform default; the API has no privacy parameter.
 */
export function mapMetaPrivacy(
  platform: MetaPlatform,
  raw: string | null | undefined,
): string | null {
  const v = String(raw || "").trim();
  switch (platform) {
    case "facebook": {
      const upper = v.toUpperCase();
      if (upper === "" || upper === "PUBLIC") return FACEBOOK_PRIVACY;
      return null;
    }
    case "instagram": {
      const upper = v.toUpperCase();
      if (upper === "" || upper === INSTAGRAM_PRIVACY || upper === "DEFAULT") {
        return INSTAGRAM_PRIVACY;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * The publish gate. Mirrors the proven youtube-publish order exactly:
 *   auth -> entitlement -> account ownership -> platform -> job ownership ->
 *   media -> revoked/expired -> approval -> duplicate -> creds.
 */
export function decideMetaPublish(input: {
  user: GuardUser;
  entitlement: { social_publish?: boolean } | null;
  approvalStatus: string;
  platform: string;
  account: GuardAccount | null;
  job: GuardJob | null;
  existing: { id?: string; publish_status?: string } | null;
  hasMetaCreds: boolean;
}): { status: number; code: string; metaCalled: boolean; videoUrl?: string } {
  if (!input.user) {
    return { status: 401, code: "unauthenticated", metaCalled: false };
  }
  if (!input.entitlement || input.entitlement.social_publish !== true) {
    return { status: 403, code: "not_entitled", metaCalled: false };
  }
  if (!isMetaPlatform(input.platform)) {
    return { status: 400, code: "bad_platform", metaCalled: false };
  }
  if (!input.account || input.account.user_id !== input.user.id) {
    return { status: 403, code: "account_forbidden", metaCalled: false };
  }
  if (input.account.platform && input.account.platform !== input.platform) {
    return { status: 403, code: "wrong_platform", metaCalled: false };
  }
  if (!input.job || input.job.user_id !== input.user.id) {
    return { status: 403, code: "job_forbidden", metaCalled: false };
  }
  if (input.job.status !== "completed" || !input.job.output_url) {
    return { status: 422, code: "unsupported_media", metaCalled: false };
  }
  if (input.account.status === "revoked") {
    return { status: 403, code: "revoked", metaCalled: false };
  }
  const exp = input.account.token_expires_at ? Date.parse(input.account.token_expires_at) : 0;
  if (input.account.status === "expired" || (exp && exp < Date.now())) {
    return { status: 401, code: "token_expired", metaCalled: false };
  }
  if (input.approvalStatus !== "approved") {
    return { status: 403, code: "not_approved", metaCalled: false };
  }
  if (input.existing) {
    return { status: 409, code: "duplicate_publish", metaCalled: false };
  }
  if (!input.hasMetaCreds) {
    return { status: 503, code: "oauth_not_configured", metaCalled: false };
  }
  return {
    status: 200,
    code: "ok",
    metaCalled: true,
    videoUrl: input.job.output_url,
  };
}

export function assertApproved(approvalStatus: string): void {
  if (approvalStatus !== "approved") {
    throw new Error("APPROVAL_REQUIRED");
  }
}

/** Human-facing, non-leaky error text for the UI. */
export function metaErrorText(code: string): string {
  switch (code) {
    case "not_approved":
      return "Owner approval is required before publishing.";
    case "oauth_not_configured":
      return "Meta app credentials are not configured.";
    case "duplicate_publish":
      return "This video is already queued or published to that account.";
    case "token_expired":
      return "Meta token expired. Reconnect the account.";
    case "revoked":
      return "Meta permission was revoked.";
    case "unsupported_media":
      return "Completed Boom MP4 is required.";
    case "no_page":
      return "No Facebook Page was found for this account.";
    case "no_ig_professional_account":
      return "No Instagram professional account is linked to that Page.";
    case "missing_permissions":
      return "Required Meta permissions were not granted.";
    case "bad_privacy":
      return "Unsupported privacy setting for this platform.";
    case "not_entitled":
      return "Social publishing is not included in your plan.";
    default:
      return "Publish blocked";
  }
}

/** Strip anything token-shaped before an error ever reaches the client or logs. */
export function sanitizeMetaError(raw: string): string {
  return String(raw || "publish_failed")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/access_token[=:]\s*\S+/gi, "access_token=[redacted]")
    .replace(/refresh_token[=:]\s*\S+/gi, "refresh_token=[redacted]")
    .replace(/client_secret[=:]\s*\S+/gi, "client_secret=[redacted]")
    .replace(/EAA[A-Za-z0-9_-]{10,}/g, "[redacted]")
    .slice(0, 300);
}

/** Map a platform outcome onto the shared publish_status vocabulary. */
export function mapMetaPublishStatus(input: {
  httpStatus: number;
  postedId?: string | null;
  graphErrorCode?: number | null;
}): string {
  if (input.postedId) return "published";
  if (input.httpStatus === 401 || input.graphErrorCode === 190) return "token_expired";
  if (input.httpStatus === 429 || input.graphErrorCode === 4 || input.graphErrorCode === 17) {
    return "processing";
  }
  if (input.httpStatus >= 400) return "failed";
  return "processing";
}
