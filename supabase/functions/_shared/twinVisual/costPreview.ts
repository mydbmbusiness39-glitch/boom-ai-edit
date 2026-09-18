/**
 * Cost preview for the AI Twin product layer.
 *
 * Rates are the MEASURED production rates from Gate #79 (2026-09-18), not guesses:
 *   photo avatar create : $1.32  (10.00 -> 8.68)
 *   video, 5.56 s clip  : $0.20  ( 8.68 -> 8.48)  => ~$0.036 per second
 * Keep these as named constants so a rate change is a one-line, reviewable edit.
 */

export const RATES = {
  avatarCreateMinor: 132,
  videoPerSecondMinor: 3.6,
  voiceCloneMinor: 0
} as const;

/** The product-wide per-generation ceiling, in minor units. Not a request parameter. */
export const DEFAULT_SPEND_CEILING_MINOR = 300;

export interface CostPreviewInput {
  audioDurationS: number;
  /** Reuse is the normal path; true only when the twig has no persisted avatar. */
  willCreateAvatar?: boolean;
  /** The account's remaining provider balance, if known (minor units). */
  providerBalanceMinor?: number | null;
  ceilingMinor?: number;
}

export interface CostPreview {
  /** What this generation is expected to cost, minor units + a display string. */
  estimatedMinor: number;
  estimatedDisplay: string;
  breakdown: { label: string; minor: number }[];
  avatarReused: boolean;
  /** True when the estimate exceeds the server-side ceiling: the request is refused. */
  exceedsCeiling: boolean;
  /** True when the known provider balance cannot cover the estimate. */
  insufficientProviderBalance: boolean;
  ceilingMinor: number;
  /** Set when the caller should be told to stop before anything paid happens. */
  blockedReason: string | null;
}

function display(minor: number): string {
  return `$${(minor / 100).toFixed(2)}`;
}

export function estimateCost(input: CostPreviewInput): CostPreview {
  const ceiling = input.ceilingMinor ?? DEFAULT_SPEND_CEILING_MINOR;
  const dur = Math.max(0, Number(input.audioDurationS) || 0);
  const willCreateAvatar = input.willCreateAvatar === true;

  const videoMinor = Math.ceil(dur * RATES.videoPerSecondMinor);
  const breakdown: { label: string; minor: number }[] = [];
  if (willCreateAvatar) breakdown.push({ label: "Create visual avatar (one-off)", minor: RATES.avatarCreateMinor });
  breakdown.push({ label: `Generate ${dur.toFixed(1)} s talking-head video`, minor: videoMinor });

  const estimatedMinor = breakdown.reduce((s, b) => s + b.minor, 0);
  const exceedsCeiling = estimatedMinor > ceiling;
  const insufficientProviderBalance =
    typeof input.providerBalanceMinor === "number" && input.providerBalanceMinor < estimatedMinor;

  return {
    estimatedMinor,
    estimatedDisplay: display(estimatedMinor),
    breakdown,
    avatarReused: !willCreateAvatar,
    exceedsCeiling,
    insufficientProviderBalance,
    ceilingMinor: ceiling,
    blockedReason: exceedsCeiling
      ? "spend limit reached"
      : insufficientProviderBalance
        ? "provider temporarily unavailable"
        : null
  };
}

/**
 * Decide whether a generation may proceed. Called server-side immediately before the
 * paid call; the preview shown in the UI is advisory and this is authoritative.
 */
export function authorizeSpend(
  estimate: CostPreview,
  enabled: { allowGeneration: boolean }
): { ok: true } | { ok: false; userMessage: string; code: string } {
  if (estimate.exceedsCeiling) {
    return {
      ok: false,
      userMessage: "Spend limit reached for this generation.",
      code: "SPEND_CEILING_EXCEEDED"
    };
  }
  if (estimate.insufficientProviderBalance) {
    return {
      ok: false,
      userMessage: "Provider temporarily unavailable. Please try again later.",
      code: "INSUFFICIENT_PROVIDER_BALANCE"
    };
  }
  if (!enabled.allowGeneration) {
    // Kill switch. The caller never learns whether a switch exists.
    return {
      ok: false,
      userMessage: "Video generation is temporarily unavailable.",
      code: "PROVIDER_GENERATION_DISABLED"
    };
  }
  return { ok: true };
}
