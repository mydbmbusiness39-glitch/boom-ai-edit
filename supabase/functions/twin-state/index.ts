/**
 * AI Twin product layer — READ-ONLY state for the Twin Setup page and the cost preview.
 *
 * Contacts NO provider. Safe to call as often as the UI likes. Never returns a provider
 * key, a raw secret, or an unmasked provider id.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, capabilitiesForRole, roleFromProfile } from "../_shared/twinVisual/capabilities.ts";
import { estimateCost } from "../_shared/twinVisual/costPreview.ts";
import { activeVersion, versionList } from "../_shared/twinVisual/twinVersions.ts";
import { sanitizeForLog, userError } from "../_shared/twinVisual/userErrors.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** Show a short fingerprint, never the whole provider id. */
const fingerprint = (id: string | null | undefined) =>
  !id ? null : id.length <= 8 ? `…${id}` : `…${id.slice(-8)}`;

Deno.serve(async (req: Request) => {
  try {
    return await handle(req);
  } catch (err) {
    // Never a bare 500: name the failure in a sanitized form so it is diagnosable.
    const name = (err as { name?: string })?.name ?? "Error";
    const msg = sanitizeForLog((err as { message?: string })?.message ?? err, 200);
    const stack = sanitizeForLog((err as { stack?: string })?.stack ?? "", 300);
    console.log(`[twin-state] UNHANDLED ${name}: ${msg} :: ${stack}`);
    return json(500, {
      ...userError("GENERATION_FAILED"),
      error: "TWIN_STATE_INTERNAL",
      debug: { name, message: msg, frames: stack.split("\n").slice(0, 3) }
    });
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { ...userError("TWIN_UNAVAILABLE"), error: "No authorization header" });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json(401, { ...userError("TWIN_UNAVAILABLE"), error: "User not authenticated" });

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Role from public.profiles — the same source src/lib/access.ts uses. Fails closed.
  const { data: profile } = await service
    .from("profiles").select("role, plan").eq("id", user.id).maybeSingle();
  const role = roleFromProfile(profile);
  const authz = authorize(role, "twin.view");
  if (!authz.ok) return json(authz.http, { ...userError("TWIN_UNAVAILABLE"), error: authz.code });

  const body = await req.json().catch(() => ({}));
  const twinId = typeof body?.twinId === "string" ? body.twinId : "";
  const audioDurationS = Number(body?.audioDurationS ?? 0);

  // Only the caller's own twin is ever visible (RLS-scoped client, not the service key).
  const twinQuery = userClient.from("ai_twins")
    .select("id, name, status, consent_status, consent_version, consented_at, revoked_at, deleted_at, " +
            "voice_provider, voice_provider_id, visual_provider, visual_provider_id, " +
            "source_asset_path, preview_asset_path, created_at, updated_at, twin_versions");
  const { data: twin, error: twinErr } = twinId
    ? await twinQuery.eq("id", twinId).maybeSingle()
    : await twinQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (twinErr || !twin) {
    return json(404, { ...userError("TWIN_UNAVAILABLE"), error: "No twin found for this account" });
  }

  // account_entitlements(user_uuid uuid). Read defensively: a problem here must never
  // take the page down — the caller still learns consent/avatar state.
  let entitlement: Record<string, unknown> | null = null;
  try {
    const { data } = await service.rpc("account_entitlements", { user_uuid: user.id });
    entitlement = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
  } catch (e) {
    console.log(`[twin-state] entitlement read failed: ${sanitizeForLog(e)}`);
  }

  const { data: ops } = await service.from("ai_twin_operations")
    .select("id, kind, status, provider_job_id, attempt_count, error_code, created_at, updated_at, entitlement_snapshot")
    .eq("twin_id", twin.id).order("created_at", { ascending: false }).limit(20);

  const rows = ops ?? [];
  // A generation is "successful" when the provider accepted it and returned a job id. The
  // ledger row can still carry an earlier attempt's error_code (the row is reused across
  // attempts), so the status — not the stale error — decides.
  const lastSuccess = rows.find((o) => o.provider_job_id && o.status !== "failed") ?? null;
  const lastAttempt = rows[0] ?? null;
  const avatarReady = !!twin.visual_provider_id;

  const versions = versionList(twin as never);
  const active = activeVersion(twin as never);
  const preview = estimateCost({ audioDurationS, willCreateAvatar: !avatarReady });

  const consentOk = twin.consent_status === "explicitly_accepted" && !twin.revoked_at && !twin.deleted_at;
  const entitlementOk = entitlement ? entitlement.ai_twin !== false : true;

  return json(200, {
    ok: true,
    capabilities: capabilitiesForRole(role),
    twin: {
      id: twin.id,
      name: twin.name ?? "My Twin",
      twinVersion: active.version,
      twinVersionLabel: active.label,
      visualAvatarStatus: avatarReady ? "ready" : "not_created",
      visualProvider: twin.visual_provider ?? null,
      visualAvatarId: fingerprint(twin.visual_provider_id),
      voice: twin.voice_provider_id ? "Cloned voice (Hope)" : "Not set",
      voiceProvider: twin.voice_provider ?? null,
      voiceId: fingerprint(twin.voice_provider_id),
      consentStatus: consentOk ? "granted" : "required",
      consentVersion: twin.consent_version ?? null,
      entitlementStatus: entitlementOk ? "active" : "inactive",
      providerStatus: Deno.env.get("HEYGEN_API_KEY") ? "available" : "unavailable",
      status: twin.status ?? "unknown",
      createdAt: twin.created_at,
      updatedAt: twin.updated_at
    },
    versions: versions.map((v) => ({
      version: v.version,
      label: v.label,
      status: v.version === active.version ? "active" : v.status,
      visualAvatarId: fingerprint(v.visualProviderId),
      voiceId: fingerprint(v.voiceProviderId),
      createdAt: v.createdAt,
      notes: v.notes ?? null
    })),
    lastSuccessfulGeneration: lastSuccess
      ? {
          operationId: lastSuccess.id,
          status: lastSuccess.status,
          providerJobId: fingerprint(lastSuccess.provider_job_id),
          completedAt: lastSuccess.updated_at
        }
      : null,
    lastAttempt: lastAttempt
      ? {
          status: lastAttempt.status,
          code: lastAttempt.status === "failed" ? userError("GENERATION_FAILED").code : null,
          at: lastAttempt.created_at
        }
      : null,
    costPreview: {
      estimatedDisplay: preview.estimatedDisplay,
      estimatedMinor: preview.estimatedMinor,
      breakdown: preview.breakdown,
      avatarReused: preview.avatarReused,
      ceilingDisplay: `$${(preview.ceilingMinor / 100).toFixed(2)}`,
      blockedReason: preview.blockedReason
    },
    // UI hint only — the server re-checks every one of these before any paid call.
    readyToGenerate: consentOk && entitlementOk && avatarReady
  });
}
