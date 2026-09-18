/**
 * Gate #79 Phase 2C — decoupled two-phase visual twin flow.
 *
 * PHASE A (twin-visual-ingest):  private likeness -> create upload batch -> PUT
 *   bytes -> finalize -> persist batch_id/asset_id/ingest status -> RETURN.
 *   It NEVER waits for ingest and NEVER returns 500 for normal async processing.
 * PHASE B (twin-visual-generate): load the persisted asset -> bounded readiness
 *   check -> if still processing return PENDING (no fail, no spend) -> if ready
 *   create the avatar once and generate exactly ONE video.
 *
 * All I/O is injected, so the whole flow is exercised in unit tests with fakes:
 * no provider call, no spend, no Edge runtime required.
 *
 * STATE: reuses `ai_twin_operations.entitlement_snapshot` (jsonb) for the
 * fine-grained flow state, and the EXISTING status enum for the coarse
 * lifecycle. No schema change is required.
 */

import {
  type AssetRef,
  type AvatarRef,
  type GenerateResult,
} from "./types.ts";
import { guardAgainstNeedlessAvatarCreate, resolveAvatar } from "./avatarReuse.ts";

export type FlowState =
  | "asset_upload_requested"
  | "asset_uploaded"
  | "asset_processing"
  | "asset_ready"
  | "asset_failed"
  | "avatar_requested"
  | "avatar_created"
  | "video_requested"
  | "video_processing"
  | "video_completed"
  | "failed";

export const FLOW_STATES: FlowState[] = [
  "asset_upload_requested", "asset_uploaded", "asset_processing", "asset_ready", "asset_failed",
  "avatar_requested", "avatar_created", "video_requested", "video_processing", "video_completed", "failed",
];

/** Coarse lifecycle values available in the existing enum (no migration). */
export type CoarseStatus = "requested" | "running" | "succeeded" | "failed";

export function coarseFor(state: FlowState): CoarseStatus {
  switch (state) {
    case "asset_upload_requested":
    case "video_requested":
      return "requested";
    case "video_completed":
      return "succeeded";
    case "failed":
    case "asset_failed":
      return "failed";
    default:
      return "running";
  }
}

export interface FlowSnapshot {
  flow_state: FlowState;
  provider: string;
  batch_id?: string;
  asset_id?: string;
  /** Where the resolved avatar came from: the operation snapshot or the twin's persisted v1. */
  avatar_source?: string | null;
  ingest_status?: string;
  avatar_id?: string | null;
  look_id?: string | null;
  video_job_id?: string;
  video_status?: string;
  error_code?: string;
  /** sanitized provider message + status for the failing step (never a secret) */
  provider_error?: string;
  steps?: Record<string, string>;
}

export interface FlowOpRow {
  id: string;
  user_id: string;
  twin_id: string;
  kind: string;
  status: string;
  attempt_count: number;
  entitlement_snapshot: unknown;
  provider_job_id?: string | null;
}

export interface FlowTwinRow {
  id: string;
  user_id: string;
  status: string;
  consent_status: string;
  consented_at?: string | null;
  consent_version?: string | null;
  revoked_at?: string | null;
  deleted_at?: string | null;
  voice_provider?: string | null;
  visual_provider?: string | null;
  visual_provider_id?: string | null;
  source_asset_path?: string | null;
  preview_asset_path?: string | null;
}

export interface FlowDeps {
  now: () => string;
  /** HEYGEN_ALLOW_GENERATION — gates the PAID steps only */
  generationEnabled: boolean;
  entitlementAiTwin(userId: string): Promise<boolean>;
  getTwin(twinId: string): Promise<FlowTwinRow | null>;
  isGeneratable(twinId: string): Promise<boolean>;
  claimOperation(row: {
    twin_id: string; user_id: string; kind: "visual_render";
    idempotency_key: string; snapshot: FlowSnapshot;
  }): Promise<{ id: string } | { duplicate: true }>;
  getOperationByKey(userId: string, idempotencyKey: string): Promise<FlowOpRow | null>;
  getOperationById(id: string): Promise<FlowOpRow | null>;
  patchOperation(opId: string, snapshot: FlowSnapshot): Promise<void>;
  setTwinVisualProvider(twinId: string, provider: string, providerId: string | null): Promise<void>;
  /** server-side signed URL for a PRIVATE object (short TTL); never returned to a client */
  signPrivateObject(objectPath: string, ttlSeconds: number): Promise<string>;
  resolveSourceBytes(input: {
    userId: string; twinId: string; objectPath: string;
  }): Promise<{ ok: true; bytes: Uint8Array; contentType: string; objectPath: string }
    | { ok: false; code: string; reason: string }>;
  provider: {
    id: string;
    uploadAsset(i: {
      objectPath: string; contentType?: string; bytes?: Uint8Array; signedUrl?: string;
      title?: string; poll?: boolean; batchIdempotencyKey?: string;
    }): Promise<AssetRef>;
    getAssetStatus(assetId: string): Promise<string>;
    createAvatar(i: {
      visual: { objectPath: string; signedUrl: string; contentType?: string; bytes?: Uint8Array };
      name: string;
    }): Promise<AvatarRef>;
    /** Phase B: create the avatar from the already-ingested asset (no re-upload). */
    createAvatarFromAsset(i: { assetId: string; name: string }): Promise<AvatarRef>;
    generateVideo(r: {
      avatar: AvatarRef;
      audio: { objectPath: string; signedUrl: string; durationS: number };
      visual: { objectPath: string; signedUrl: string };
      maxDurationS: number;
      idempotencyKey: string;
    }): Promise<GenerateResult>;
  };
  /** bounded readiness polling config for Phase B (small: never a long block) */
  readinessAttempts?: number;
  readinessIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface FlowResult {
  http: number;
  body: Record<string, unknown>;
}

const NARRATION_DURATION_S = 5.564;
const MAX_CANARY_DURATION_S = 10;

/** Redact anything key-shaped and bound the length: safe to persist/report. */
function sanitizeProviderDetail(err: unknown): string {
  const raw = String((err as { message?: string })?.message ?? err ?? "");
  return raw
    .replace(/[A-Za-z0-9_-]{20,}/g, "[REDACTED]")
    .replace(/X-Api-Key[^,;]*/gi, "[REDACTED]")
    .slice(0, 300);
}

function readSnapshot(row: FlowOpRow | null): Partial<FlowSnapshot> {
  const s = row?.entitlement_snapshot;
  if (s && typeof s === "object") {
    const obj = s as Record<string, unknown>;
    const flow = (obj.flow ?? obj) as Record<string, unknown>;
    if (typeof flow.flow_state === "string") return flow as Partial<FlowSnapshot>;
  }
  return {};
}

function mergeSnapshot(base: Partial<FlowSnapshot>, patch: Partial<FlowSnapshot>): FlowSnapshot {
  return {
    flow_state: (patch.flow_state ?? base.flow_state ?? "failed") as FlowState,
    provider: patch.provider ?? base.provider ?? "heygen",
    ...base,
    ...patch,
    steps: { ...(base.steps ?? {}), ...(patch.steps ?? {}) },
  } as FlowSnapshot;
}

/** Shared, fail-closed gate: owner + consent + entitlement + generatable. */
async function gate(
  deps: FlowDeps,
  input: { userId: string; twinId: string },
): Promise<{ ok: true; twin: FlowTwinRow } | { ok: false; http: number; code: string; reason: string }> {
  if (!(await deps.entitlementAiTwin(input.userId))) {
    return { ok: false, http: 403, code: "ENTITLEMENT_REQUIRED", reason: "ai_twin entitlement is not active." };
  }
  const twin = await deps.getTwin(input.twinId);
  if (!twin || twin.user_id !== input.userId) {
    return { ok: false, http: 403, code: "TWIN_NOT_OWNED", reason: "Twin not found or not owned by the caller." };
  }
  if (twin.revoked_at || twin.deleted_at) {
    return { ok: false, http: 403, code: "TWIN_REVOKED", reason: "Twin is revoked or deleted." };
  }
  if (twin.consent_status !== "explicitly_accepted" || !twin.consented_at || !twin.consent_version) {
    return { ok: false, http: 403, code: "CONSENT_REQUIRED", reason: "Explicit consent with version is required." };
  }
  if (!(await deps.isGeneratable(input.twinId))) {
    return { ok: false, http: 403, code: "TWIN_NOT_GENERATABLE", reason: "Twin is not in a generatable state." };
  }
  return { ok: true, twin };
}

/* ============================================================== PHASE A ==== */

/**
 * UI BOOTSTRAP (unpaid, ZERO provider contact).
 *
 * The product UI's Generate action needs an operation whose snapshot already points at the
 * EXISTING likeness asset. Without it, Phase A would create a fresh upload batch (a re-upload)
 * — and a fresh operation with no snapshot avatar made Phase B reach for avatar creation.
 *
 * This establishes the operation and binds the existing asset id. It performs NO provider
 * request of any kind: no upload batch, no PUT bytes, no status read, no avatar, no video.
 * That is exactly why it is deliberately NOT gated by HEYGEN_ALLOW_ASSET_INGEST — there is no
 * provider path to gate — and the PAID switch is still required by Phase B before any spending.
 */
export async function runBootstrapBind(
  deps: FlowDeps,
  input: { userId: string; twinId: string; assetId: string; idempotencyKey: string },
): Promise<{ http: number; body: Record<string, unknown> }> {
  const g = await gate(deps, { userId: input.userId, twinId: input.twinId });
  if (!g.ok) return { http: g.http, body: { error: g.code, reason: g.reason } };

  const assetId = (input.assetId || "").trim();
  if (!assetId) return { http: 400, body: { error: "assetId required" } };

  const now = deps.now();
  const base = mergeSnapshot({}, {
    flow_state: "asset_ready",
    asset_id: assetId,
    ingest_status: "completed",
    steps: { asset_upload_requested: now, asset_uploaded: now, asset_ready: now },
  });

  // Seed the twin's PERSISTED avatar into the operation so Phase B cannot reach creation.
  const twinAvatar = (g.twin.visual_provider_id ?? "").trim() || null;
  const seeded = twinAvatar
    ? mergeSnapshot(base, { avatar_id: twinAvatar, look_id: twinAvatar, avatar_source: "twin_persisted" })
    : base;

  const claim = await deps.claimOperation({
    twin_id: input.twinId, user_id: input.userId, kind: "visual_render",
    idempotency_key: input.idempotencyKey, snapshot: seeded,
  });

  if ("duplicate" in claim) {
    const existing = await deps.getOperationByKey(input.userId, input.idempotencyKey);
    const snap = readSnapshot(existing);
    return {
      http: 200,
      body: {
        status: "bound", replayed: true, operationId: existing?.id ?? null,
        assetId: snap.asset_id ?? assetId,
        avatarId: snap.avatar_id ?? twinAvatar,
        avatarSource: snap.avatar_source ?? (twinAvatar ? "twin_persisted" : null),
        providerCalls: 0,
      },
    };
  }

  const opId = claim.id;
  await deps.patchOperation(opId, seeded);
  return {
    http: 200,
    body: {
      status: "bound", replayed: false, operationId: opId, assetId,
      avatarId: seeded.avatar_id ?? null,
      avatarSource: seeded.avatar_source ?? null,
      providerCalls: 0,
      note: "No upload, no avatar creation, no provider request of any kind.",
    },
  };
}

export async function runPhaseAIngest(
  deps: FlowDeps,
  input: { userId: string; twinId: string; idempotencyKey: string; explicitRequest: boolean },
): Promise<FlowResult> {
  if (input.explicitRequest !== true) {
    return { http: 400, body: { error: "NO_EXPLICIT_REQUEST" } };
  }
  const g = await gate(deps, input);
  if (!g.ok) return { http: g.http, body: { error: g.code, reason: g.reason } };

  const objectPath = (g.twin.source_asset_path ?? "").trim();
  if (!objectPath) {
    return { http: 409, body: { error: "NO_LIKENESS_STORED", reason: "Twin has no private likeness object." } };
  }

  const base: FlowSnapshot = {
    flow_state: "asset_upload_requested",
    provider: deps.provider.id,
    steps: { asset_upload_requested: deps.now() },
  };
  const claim = await deps.claimOperation({
    twin_id: input.twinId, user_id: input.userId, kind: "visual_render",
    idempotency_key: input.idempotencyKey, snapshot: base,
  });

  // --- idempotency: a repeated Phase A NEVER uploads a second time -----------
  if ("duplicate" in claim) {
    const existing = await deps.getOperationByKey(input.userId, input.idempotencyKey);
    const snap = readSnapshot(existing);
    if (!snap.asset_id) {
      return {
        http: 409,
        body: { error: "INGEST_ALREADY_CLAIMED", reason: "This idempotency key is claimed but has no asset yet.", assetId: null },
      };
    }
    return {
      http: 202,
      body: {
        status: snap.ingest_status === "completed" ? "ready" : "pending",
        replayed: true,
        assetId: snap.asset_id,
        batchId: snap.batch_id,
        ingestStatus: snap.ingest_status,
        flowState: snap.flow_state,
      },
    };
  }

  const opId = claim.id;

  // --- resolve private bytes server-side ------------------------------------
  const source = await deps.resolveSourceBytes({
    userId: input.userId, twinId: input.twinId, objectPath,
  });
  if (!source.ok) {
    const failed = mergeSnapshot(base, { flow_state: "failed", error_code: source.code });
    await deps.patchOperation(opId, failed);
    return { http: 422, body: { error: source.code, reason: source.reason } };
  }

  // --- ONE upload attempt: batch -> PUT -> finalize. Never waits for ingest. --
  let asset: AssetRef;
  try {
    asset = await deps.provider.uploadAsset({
      objectPath: source.objectPath,
      contentType: source.contentType,
      bytes: source.bytes,
      title: `twin-${input.twinId.slice(0, 8)}`,
      poll: false, // PHASE A MUST NOT BLOCK
      batchIdempotencyKey: `twin-asset-op-${opId}`, // scoped to THIS operation
    });
  } catch (err) {
    const step = (err as { step?: string })?.step ?? "unknown";
    const status = (err as { httpStatus?: number })?.httpStatus ?? 0;
    const failed = mergeSnapshot(base, {
      flow_state: "failed",
      error_code: `ASSET_UPLOAD_FAILED:${step}:${status}`,
      steps: { asset_upload_failed: deps.now() },
    });
    await deps.patchOperation(opId, failed);
    // sanitized: no key, no provider body
    return { http: 502, body: { error: "ASSET_UPLOAD_FAILED", step, providerStatus: status } };
  }

  const ingest = String(asset.ingestStatus ?? "queued").toLowerCase();
  const state: FlowState = ingest === "completed" ? "asset_ready" : ingest === "failed" ? "asset_failed" : "asset_uploaded";
  const snap = mergeSnapshot(base, {
    flow_state: state,
    batch_id: asset.batchId,
    asset_id: asset.assetId,
    ingest_status: ingest,
    error_code: ingest === "failed" ? "ASSET_INGEST_FAILED" : undefined,
    steps: { asset_uploaded: deps.now() },
  });
  await deps.patchOperation(opId, snap);

  return {
    http: 202, // accepted: ingest is async, this is NOT an error
    body: {
      status: "pending",
      replayed: false,
      operationId: opId,
      provider: asset.provider,
      assetId: asset.assetId,
      batchId: asset.batchId,
      ingestStatus: ingest,
      flowState: state,
      bytes: asset.sizeBytes,
      checksumSha256: asset.checksumSha256,
    },
  };
}

/* ============================================================== PHASE B ==== */

export async function runPhaseBGenerate(
  deps: FlowDeps,
  input: { userId: string; twinId: string; operationId?: string; idempotencyKey?: string },
): Promise<FlowResult> {
  const op = input.operationId
    ? await deps.getOperationById(input.operationId)
    : input.idempotencyKey
      ? await deps.getOperationByKey(input.userId, input.idempotencyKey)
      : null;
  if (!op) return { http: 404, body: { error: "OPERATION_NOT_FOUND" } };
  if (op.user_id !== input.userId || op.twin_id !== input.twinId) {
    return { http: 403, body: { error: "OPERATION_NOT_OWNED" } };
  }

  const snap = readSnapshot(op);
  if (!snap.asset_id) {
    return { http: 409, body: { error: "NO_ASSET_INGESTED", reason: "Run Phase A ingest first." } };
  }

  // --- idempotency: an existing video job is returned, never re-requested ----
  if (snap.video_job_id) {
    return {
      http: 200,
      body: {
        status: "already_requested", replayed: true,
        providerJobId: snap.video_job_id, avatarId: snap.avatar_id, flowState: snap.flow_state,
      },
    };
  }

  const g = await gate(deps, input);
  if (!g.ok) return { http: g.http, body: { error: g.code, reason: g.reason } };

  // --- bounded readiness check (never a long block) -------------------------
  const attempts = deps.readinessAttempts ?? 3;
  const interval = deps.readinessIntervalMs ?? 3000;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let ingest = String(snap.ingest_status ?? "unknown").toLowerCase();
  for (let i = 0; i < attempts; i++) {
    try {
      ingest = await deps.provider.getAssetStatus(snap.asset_id);
    } catch {
      ingest = "unknown";
    }
    if (ingest === "completed" || ingest === "failed" || ingest === "not_found") break;
    if (i < attempts - 1) await sleep(interval);
  }

  if (ingest === "failed" || ingest === "not_found") {
    const failed = mergeSnapshot(snap, {
      flow_state: "asset_failed",
      ingest_status: ingest,
      error_code: `ASSET_${ingest.toUpperCase()}`,
      steps: { asset_failed: deps.now() },
    });
    await deps.patchOperation(op.id, failed);
    return { http: 422, body: { error: "ASSET_NOT_USABLE", ingestStatus: ingest } };
  }

  if (ingest !== "completed") {
    // normal async processing -> PENDING, not an error, and no spend
    const pending = mergeSnapshot(snap, {
      flow_state: "asset_processing",
      ingest_status: ingest,
      steps: { asset_processing: deps.now() },
    });
    await deps.patchOperation(op.id, pending);
    return {
      http: 202,
      body: { status: "pending", ingestStatus: ingest, assetId: snap.asset_id, reason: "asset still ingesting" },
    };
  }

  // asset is ready
  let current = mergeSnapshot(snap, {
    flow_state: "asset_ready", ingest_status: "completed", steps: { asset_ready: deps.now() },
  });
  await deps.patchOperation(op.id, current);

  // --- PAID steps require the explicit switch -------------------------------
  if (!deps.generationEnabled) {
    return {
      http: 501,
      body: {
        error: "provider_generation_disabled_phase2c",
        flag: "HEYGEN_ALLOW_GENERATION",
        operationId: op.id,
        assetId: snap.asset_id,
        note: "Asset is ready. Avatar/video generation requires HEYGEN_ALLOW_GENERATION=TRUE.",
      },
    };
  }

  // --- avatar: exactly once. Resolve from the operation snapshot FIRST, then the twin's
  // PERSISTED avatar (v1's proven avatar) — creating is the last resort, never a fallback
  // for a missing snapshot. Owner HARD ASSERTION: a fresh operation on a twin that already
  // has a persisted avatar must never enter the create branch.
  const resolution = resolveAvatar({
    snapAvatarId: snap.avatar_id,
    snapLookId: snap.look_id,
    twinVisualProviderId: g.twin.visual_provider_id,
  });
  const createRefusal = guardAgainstNeedlessAvatarCreate(resolution, g.twin.visual_provider_id);
  if (createRefusal) {
    // Impossible state reached: fail closed rather than buy a duplicate avatar.
    const refused = mergeSnapshot(current, { flow_state: "failed", error_code: createRefusal });
    await deps.patchOperation(op.id, refused);
    return {
      http: 409,
      body: { error: createRefusal, reason: "An existing avatar must be reused, not recreated." },
    };
  }
  let avatarId: string | null = resolution.avatarId;
  let lookId: string | null = resolution.lookId;
  if (resolution.source === "twin") {
    // Persist the resolution so a retry reads it from the snapshot, and so the ledger shows
    // WHERE the avatar came from.
    current = mergeSnapshot(current, {
      avatar_id: resolution.avatarId,
      look_id: resolution.lookId,
      avatar_source: "twin_persisted",
    });
    await deps.patchOperation(op.id, current);
  }
  if (!avatarId) {
    current = mergeSnapshot(current, { flow_state: "avatar_requested", steps: { avatar_requested: deps.now() } });
    await deps.patchOperation(op.id, current);
    let created: AvatarRef;
    try {
      created = await deps.provider.createAvatarFromAsset({
        assetId: snap.asset_id,
        name: `twin-${input.twinId.slice(0, 8)}`,
      });
    } catch (err) {
      // Surface the provider's status and a SANITIZED message: without them the
      // persisted record cannot distinguish a bad payload from a plan/entitlement
      // refusal, and every retry fails blind.
      const step = (err as { step?: string })?.step ?? "create_avatar";
      const status = (err as { httpStatus?: number })?.httpStatus ?? 0;
      const detail = sanitizeProviderDetail(err);
      const failed = mergeSnapshot(current, {
        flow_state: "failed",
        error_code: `AVATAR_CREATE_FAILED:${step}:${status}`,
        provider_error: detail,
      });
      await deps.patchOperation(op.id, failed);
      return { http: 502, body: { error: "AVATAR_CREATE_FAILED", step, providerStatus: status, detail } };
    }
    avatarId = created.lookId ?? created.avatarId ?? null;
    lookId = created.lookId ?? null;
    current = mergeSnapshot(current, {
      flow_state: "avatar_created", avatar_id: created.avatarId, look_id: created.lookId,
      steps: { avatar_created: deps.now() },
    });
    await deps.patchOperation(op.id, current);
    await deps.setTwinVisualProvider(input.twinId, deps.provider.id, avatarId ?? null);
  }

  // --- video: exactly once --------------------------------------------------
  const audioObjectPath = (g.twin.preview_asset_path ?? "").trim();
  if (!audioObjectPath || /^[a-z][a-z0-9+.-]*:\/\//i.test(audioObjectPath)) {
    return { http: 422, body: { error: "NARRATION_NOT_PRIVATE_OBJECT" } };
  }
  const audioSignedUrl = await deps.signPrivateObject(audioObjectPath, 120);
  if (!audioSignedUrl) return { http: 422, body: { error: "NARRATION_SIGN_FAILED" } };

  let gen: GenerateResult;
  try {
    gen = await deps.provider.generateVideo({
      avatar: { provider: "heygen", avatarId: lookId ?? avatarId ?? "", lookId: lookId ?? undefined },
      audio: { objectPath: audioObjectPath, signedUrl: audioSignedUrl, durationS: NARRATION_DURATION_S },
      visual: { objectPath: "", signedUrl: "" },
      maxDurationS: MAX_CANARY_DURATION_S,
      idempotencyKey: `${op.id}:video`,
    });
  } catch (err) {
    // Same diagnosability treatment as the avatar step: persist the provider status
    // and a sanitized message, otherwise the failure is blind.
    const step = (err as { step?: string })?.step ?? "generate_video";
    const status = (err as { httpStatus?: number })?.httpStatus ?? 0;
    const detail = sanitizeProviderDetail(err);
    const failed = mergeSnapshot(current, {
      flow_state: "failed",
      error_code: `VIDEO_REQUEST_FAILED:${step}:${status}`,
      provider_error: detail,
    });
    await deps.patchOperation(op.id, failed);
    return { http: 502, body: { error: "VIDEO_REQUEST_FAILED", step, providerStatus: status, detail } };
  }

  const done = mergeSnapshot(current, {
    flow_state: "video_requested",
    video_job_id: gen.providerJobId,
    video_status: gen.status,
    steps: { video_requested: deps.now() },
  });
  await deps.patchOperation(op.id, done);

  return {
    http: 200,
    body: {
      status: gen.status, providerJobId: gen.providerJobId, avatarId, lookId,
      operationId: op.id, audioDurationS: NARRATION_DURATION_S,
    },
  };
}
