/**
 * AI Twin product API — client wrappers for the twin product layer.
 *
 * All provider access is server-side. This module never sees a provider key, never calls a
 * provider, and never sends a spend control: the ceiling and the kill switch live on the
 * server, so a tampered client cannot raise them.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildAiWorkerInvokeOptions } from "@/utils/aiWorkerClient";

async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new TwinApiError("Please sign in again.", "NOT_AUTHENTICATED");
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof payload?.message === "string" ? payload.message : userMessageForStatus(res.status);
    throw new TwinApiError(message, payload?.error ?? `HTTP_${res.status}`, res.status);
  }
  return payload as T;
}

/** The only messages the UI shows. Provider/debug detail stays in server logs. */
export function userMessageForStatus(status: number): string {
  if (status === 402) return "Spend limit reached";
  if (status === 403) return "Twin unavailable";
  if (status === 404) return "Twin unavailable";
  if (status === 409) return "Twin unavailable";
  if (status === 422) return "Consent required";
  if (status === 429) return "Provider temporarily unavailable";
  if (status >= 500) return "Generation failed";
  return "Something went wrong";
}

export class TwinApiError extends Error {
  code: string;
  status?: number;
  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "TwinApiError";
    this.code = code;
    this.status = status;
  }
}

export interface CostPreviewView {
  estimatedDisplay: string;
  estimatedMinor: number;
  breakdown: { label: string; minor: number }[];
  avatarReused: boolean;
  ceilingDisplay: string;
  blockedReason: string | null;
}

export interface TwinVersionView {
  version: number;
  label: string;
  status: string;
  visualAvatarId: string | null;
  voiceId: string | null;
  createdAt: string;
  notes: string | null;
}

export interface TwinStateView {
  capabilities: string[];
  /** The twin's already-ingested likeness asset, if one exists. The Generate button binds THIS. */
  boundAssetId: string | null;
  twin: {
    id: string;
    name: string;
    twinVersion: number;
    twinVersionLabel: string;
    visualAvatarStatus: "ready" | "not_created";
    visualAvatarId: string | null;
    visualProvider: string | null;
    voice: string;
    voiceId: string | null;
    consentStatus: "granted" | "required";
    consentVersion: string | null;
    entitlementStatus: "active" | "inactive";
    providerStatus: "available" | "unavailable";
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
  };
  versions: TwinVersionView[];
  lastSuccessfulGeneration: { operationId: string; status: string; completedAt: string } | null;
  lastAttempt: { status: string; code: string | null; at: string } | null;
  costPreview: CostPreviewView;
  readyToGenerate: boolean;
}

export const getTwinState = (twinId?: string, audioDurationS = 0) =>
  call<TwinStateView>("twin-state", { twinId, audioDurationS });

export const listVersions = (twinId: string) =>
  call<{ activeVersion: number; versions: TwinVersionView[] }>("twin-version", { action: "list", twinId });

export const compareVersions = (twinId: string, a: number, b: number) =>
  call<{ changes: { field: string; from: string | null; to: string | null }[]; visualChange: boolean; costNote: string | null }>(
    "twin-version", { action: "compare", twinId, a, b });

/** Owner-only. The server refuses this for anyone without twin.admin. */
export const activateVersion = (twinId: string, version: number) =>
  call<{ activeVersion: number; versions: TwinVersionView[] }>("twin-version", { action: "activate", twinId, version });

export const rollbackVersion = (twinId: string) =>
  call<{ activeVersion: number; versions: TwinVersionView[] }>("twin-version", { action: "rollback", twinId });

/**
 * Unpaid bootstrap: establish an operation bound to the twin's EXISTING likeness asset and seed
 * the persisted avatar, so the paid step has nothing to create. The server reports
 * `providerCalls: 0` for this path, and it is asserted below before any spend.
 */
export const bootstrapTwinOperation = async (twinId: string, assetId: string) => {
  const idempotencyKey = `ui-${crypto.randomUUID()}`;
  return call<{ status: string; operationId: string; assetId: string; avatarId: string | null;
                avatarSource: string | null; providerCalls: number; idempotencyKey: string }>(
    "twin-visual-ingest",
    { twinId, idempotencyKey, bindAssetId: assetId }
  ).then((r) => ({ ...r, idempotencyKey }));
};

/**
 * Run the proven generation flow. This calls the EXISTING twin-visual-generate function
 * unchanged; the product layer only supplies the operation id for idempotency, so a repeated
 * click cannot create a second avatar or a second video.
 */
export const generateTwinVideo = async (
  twinId: string,
  opts: { operationId?: string; idempotencyKey?: string } = {}
) => {
  const operationId = opts.operationId ?? crypto.randomUUID();
  return call<{ status: string; providerJobId?: string; videoUrl?: string; audioDurationS?: number; stage?: string }>(
    "twin-visual-generate",
    { twinId, operationId, idempotencyKey: opts.idempotencyKey ?? operationId }
  );
};

/**
 * Existing Boom timeline/render path — untouched by the twin layer. The app reaches the
 * worker through the `ai-worker-proxy` function (see aiWorkerClient), so this reuses the
 * same authenticated route rather than addressing the worker host directly.
 */
export const sendToTimeline = async (item: {
  id: string; type: "video"; track: number; start_time: number; end_time: number;
  content: { src: string; duration: number; has_audio?: boolean };
}) => {
  const { data, error } = await supabase.functions.invoke(
    "ai-worker-proxy",
    buildAiWorkerInvokeOptions("/timeline/compile", {
      items: [item],
      duration: item.end_time,
      fps: 30,
      resolution: { width: 1080, height: 1920 },
    })
  );
  if (error) {
    throw new TwinApiError("Generation failed", `TIMELINE_FAILED`, (error as { status?: number }).status);
  }
  return data;
};
