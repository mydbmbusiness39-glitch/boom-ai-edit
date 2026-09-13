/** Pure Gate #78 publish/oauth guards. No network. Never returns tokens. */

export type GuardUser = { id: string } | null;
export type GuardAccount = {
  user_id: string;
  status: string;
  token_expires_at?: string | null;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  platform_username?: string;
  id?: string;
  platform?: string;
};
export type GuardJob = {
  user_id: string;
  status: string;
  output_url?: string | null;
};

export function safeAccount(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  const {
    access_token_encrypted: _a,
    refresh_token_encrypted: _r,
    ...rest
  } = row as Record<string, unknown>;
  return rest;
}

export function decideOAuthStart(input: {
  user: GuardUser;
  hasTikTokCreds: boolean;
}): { status: number; code?: string } {
  if (!input.user) return { status: 401, code: "unauthenticated" };
  if (!input.hasTikTokCreds) return { status: 503, code: "oauth_not_configured" };
  return { status: 200 };
}

export function decidePublish(input: {
  user: GuardUser;
  entitlement: { social_publish?: boolean } | null;
  approvalStatus: string;
  account: GuardAccount | null;
  job: GuardJob | null;
  existing: { id?: string; publish_status?: string } | null;
  hasTikTokCreds: boolean;
}): {
  status: number;
  code?: string;
  tiktokCalled: boolean;
  videoUrl?: string;
} {
  if (!input.user) return { status: 401, code: "unauthenticated", tiktokCalled: false };
  if (!input.entitlement || input.entitlement.social_publish !== true) {
    return { status: 403, code: "not_entitled", tiktokCalled: false };
  }
  if (!input.account || input.account.user_id !== input.user.id) {
    return { status: 403, code: "account_forbidden", tiktokCalled: false };
  }
  if (!input.job || input.job.user_id !== input.user.id) {
    return { status: 403, code: "job_forbidden", tiktokCalled: false };
  }
  if (input.job.status !== "completed" || !input.job.output_url) {
    return { status: 422, code: "unsupported_media", tiktokCalled: false };
  }
  if (input.account.status === "revoked") {
    return { status: 403, code: "revoked", tiktokCalled: false };
  }
  const exp = input.account.token_expires_at ? Date.parse(input.account.token_expires_at) : 0;
  if (input.account.status === "expired" || (exp && exp < Date.now())) {
    return { status: 401, code: "token_expired", tiktokCalled: false };
  }
  if (input.approvalStatus !== "approved") {
    return { status: 403, code: "not_approved", tiktokCalled: false };
  }
  if (input.existing) {
    return { status: 409, code: "duplicate_publish", tiktokCalled: false };
  }
  if (!input.hasTikTokCreds) {
    return { status: 503, code: "oauth_not_configured", tiktokCalled: false };
  }
  return {
    status: 200,
    code: "ok",
    tiktokCalled: true,
    videoUrl: input.job.output_url,
  };
}

export function assertApproved(approvalStatus: string): void {
  if (approvalStatus !== "approved") {
    throw new Error("APPROVAL_REQUIRED");
  }
}

export function sanitizeTikTokError(raw: string): string {
  return String(raw || "publish_failed")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/access_token[=:]\s*\S+/gi, "access_token=[redacted]")
    .slice(0, 300);
}

export function mapTikTokStatus(status: string | undefined): string {
  const s = (status || "").toUpperCase();
  if (s === "PUBLISH_COMPLETE" || s === "SEND_TO_USER_INBOX") return "published";
  if (s === "PROCESSING_UPLOAD" || s === "PROCESSING_DOWNLOAD") return "processing";
  if (s === "FAILED" || s === "PUBLISH_FAILED") return "failed";
  return "processing";
}
