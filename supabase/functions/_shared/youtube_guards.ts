/** Pure Gate #78 YouTube publish/oauth guards. No network. Never returns tokens. */

export type GuardUser = { id: string } | null;
export type GuardAccount = {
  user_id: string;
  status: string;
  platform?: string;
  token_expires_at?: string | null;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  platform_username?: string;
  id?: string;
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

export function decideYouTubeOAuthStart(input: {
  user: GuardUser;
  hasGoogleCreds: boolean;
}): { status: number; code?: string } {
  if (!input.user) return { status: 401, code: "unauthenticated" };
  if (!input.hasGoogleCreds) return { status: 503, code: "oauth_not_configured" };
  return { status: 200 };
}

export function mapYouTubePrivacy(raw: string | null | undefined): "private" | "unlisted" | "public" | null {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "private" || v === "unlisted" || v === "public") return v;
  return null;
}

export function decideYouTubePublish(input: {
  user: GuardUser;
  entitlement: { social_publish?: boolean } | null;
  approvalStatus: string;
  account: GuardAccount | null;
  job: GuardJob | null;
  existing: { id?: string; publish_status?: string } | null;
  hasGoogleCreds: boolean;
}): {
  status: number;
  code?: string;
  youtubeCalled: boolean;
  videoUrl?: string;
} {
  if (!input.user) return { status: 401, code: "unauthenticated", youtubeCalled: false };
  if (!input.entitlement || input.entitlement.social_publish !== true) {
    return { status: 403, code: "not_entitled", youtubeCalled: false };
  }
  if (!input.account || input.account.user_id !== input.user.id) {
    return { status: 403, code: "account_forbidden", youtubeCalled: false };
  }
  if (input.account.platform && input.account.platform !== "youtube") {
    return { status: 403, code: "wrong_platform", youtubeCalled: false };
  }
  if (!input.job || input.job.user_id !== input.user.id) {
    return { status: 403, code: "job_forbidden", youtubeCalled: false };
  }
  if (input.job.status !== "completed" || !input.job.output_url) {
    return { status: 422, code: "unsupported_media", youtubeCalled: false };
  }
  if (input.account.status === "revoked") {
    return { status: 403, code: "revoked", youtubeCalled: false };
  }
  const exp = input.account.token_expires_at ? Date.parse(input.account.token_expires_at) : 0;
  if (input.account.status === "expired" || (exp && exp < Date.now())) {
    return { status: 401, code: "token_expired", youtubeCalled: false };
  }
  if (input.approvalStatus !== "approved") {
    return { status: 403, code: "not_approved", youtubeCalled: false };
  }
  if (input.existing) {
    return { status: 409, code: "duplicate_publish", youtubeCalled: false };
  }
  if (!input.hasGoogleCreds) {
    return { status: 503, code: "oauth_not_configured", youtubeCalled: false };
  }
  return {
    status: 200,
    code: "ok",
    youtubeCalled: true,
    videoUrl: input.job.output_url,
  };
}

export function assertApproved(approvalStatus: string): void {
  if (approvalStatus !== "approved") {
    throw new Error("APPROVAL_REQUIRED");
  }
}

export function sanitizeYouTubeError(raw: string): string {
  return String(raw || "publish_failed")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/access_token[=:]\s*\S+/gi, "access_token=[redacted]")
    .replace(/refresh_token[=:]\s*\S+/gi, "refresh_token=[redacted]")
    .slice(0, 300);
}

export function mapYouTubeUploadStatus(httpStatus: number, videoId?: string | null): string {
  if (videoId) return "published";
  if (httpStatus === 401) return "token_expired";
  if (httpStatus >= 500) return "processing";
  if (httpStatus >= 400) return "failed";
  return "uploading";
}
