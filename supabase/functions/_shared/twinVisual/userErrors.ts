/**
 * User-facing error vocabulary for the AI Twin product layer.
 *
 * RULE: the UI shows one of the SIMPLE messages below. Provider HTTP statuses, step names,
 * raw provider text and internal ids stay in sanitized server logs (see sanitizeForLog).
 */

export const USER_ERRORS = {
  TWIN_UNAVAILABLE: "Twin unavailable",
  CONSENT_REQUIRED: "Consent required",
  GENERATION_FAILED: "Generation failed",
  PROVIDER_TEMPORARILY_UNAVAILABLE: "Provider temporarily unavailable",
  SPEND_LIMIT_REACHED: "Spend limit reached"
} as const;

export type UserErrorCode = keyof typeof USER_ERRORS;

export interface UserFacingError {
  code: UserErrorCode;
  message: string;
  /** Safe to show as a secondary line. Never contains provider text or ids. */
  detail?: string;
  retryable: boolean;
}

const RETRYABLE: Record<UserErrorCode, boolean> = {
  TWIN_UNAVAILABLE: false,
  CONSENT_REQUIRED: false,
  GENERATION_FAILED: true,
  PROVIDER_TEMPORARILY_UNAVAILABLE: true,
  SPEND_LIMIT_REACHED: false
};

export function userError(code: UserErrorCode, detail?: string): UserFacingError {
  return { code, message: USER_ERRORS[code], detail, retryable: RETRYABLE[code] };
}

/** Map an internal failure code (e.g. AVATAR_CREATE_FAILED:create_avatar:402) to a user error. */
export function userErrorFromInternal(internalCode: string): UserFacingError {
  const c = (internalCode || "").toUpperCase();
  if (c.includes("CONSENT") || c.includes("ENTITLEMENT")) return userError("CONSENT_REQUIRED");
  if (c.includes("SPEND") || c.includes("CEILING")) return userError("SPEND_LIMIT_REACHED");
  if (c.includes("DISABLED")) return userError("PROVIDER_TEMPORARILY_UNAVAILABLE");
  if (c.includes("402") || c.includes("INSUFFICIENT") || c.includes("BALANCE")) {
    return userError("PROVIDER_TEMPORARILY_UNAVAILABLE");
  }
  if (c.includes("NOT_FOUND") || c.includes("REVOKED") || c.includes("DELETED")) {
    return userError("TWIN_UNAVAILABLE");
  }
  return userError("GENERATION_FAILED");
}

/**
 * Sanitize anything before it reaches a log line: strip key-shaped text, bearer tokens,
 * long base64/hex blobs, signed-URL query strings and emails.
 */
export function sanitizeForLog(value: unknown, maxLen = 300): string {
  let s = typeof value === "string" ? value : safeJson(value);
  s = s.replace(/eyJ[A-Za-z0-9_\-.]{10,}/g, "[REDACTED_JWT]");
  // Vendor key formats first (sk_live_…, sk-test-…), then generic keyword-anchored tokens.
  s = s.replace(/\b(?:sk|pk|rk)[_-](?:live|test|prod)[_-][A-Za-z0-9_-]{6,}/gi, "[REDACTED_KEY]");
  s = s.replace(/\b(?:sk|pk|rk)[_-][A-Za-z0-9]{12,}/gi, "[REDACTED_KEY]");
  s = s.replace(/\b(?:key|token|secret|bearer|apikey|api[_-]key)[_-]?[A-Za-z0-9_-]{8,}/gi, "[REDACTED_KEY]");
  s = s.replace(/X-Api-Key[^,}]*/gi, "[REDACTED_HEADER]");
  s = s.replace(/[?&](token|signature|X-Amz-[A-Za-z-]+|Expires)=[^&\s"']+/gi, "[REDACTED_QUERY]");
  s = s.replace(/[A-Fa-f0-9]{32,}/g, "[REDACTED_HEX]");
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]");
  s = s.replace(/https?:\/\/[^\s"']{40,}/g, "[REDACTED_URL]");
  return s.length > maxLen ? `${s.slice(0, maxLen)}…[truncated]` : s;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}
