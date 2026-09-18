/**
 * Gate #79 Phase 2C — PHASE A: private likeness -> upload batch -> PUT bytes ->
 * finalize -> persist asset_id/batch_id/status -> return.
 *
 * Never waits for ingest, never creates an avatar or video, never returns 500
 * for normal async processing (a still-processing asset returns 202 pending).
 * Unpaid path: gated by HEYGEN_ALLOW_ASSET_INGEST (not the paid switch).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runBootstrapBind, runPhaseAIngest } from "../_shared/twinVisual/flow.ts";
import { buildDeps, switchesFromEnv } from "../_shared/twinVisual/denoDeps.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "No authorization header" });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json(401, { error: "User not authenticated" });

  const body = await req.json().catch(() => ({}));
  const twinId = typeof body?.twinId === "string" ? body.twinId : "";
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
  const bindAssetId = typeof body?.bindAssetId === "string" ? body.bindAssetId : "";
  if (!twinId) return json(400, { error: "twinId required" });
  if (idempotencyKey.length < 8) return json(400, { error: "idempotencyKey required" });

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const sw = switchesFromEnv((k) => Deno.env.get(k));

  const deps = buildDeps({
    userClient, service,
    apiKey: Deno.env.get("HEYGEN_API_KEY") ?? "",
    generationEnabled: sw.generationEnabled,
    assetIngestEnabled: sw.assetIngestEnabled,
    userId: user.id,
  });

  // UI BOOTSTRAP first: binding an EXISTING asset contacts no provider at all, so it needs no
  // ingest switch. The paid switch still governs Phase B.
  if (bindAssetId) {
    try {
      const bound = await runBootstrapBind(deps, { userId: user.id, twinId, assetId: bindAssetId, idempotencyKey });
      return json(bound.http, bound.body);
    } catch {
      return json(500, { error: "BOOTSTRAP_INTERNAL_ERROR" });
    }
  }

  // asset ingest is unpaid, but still explicitly switched on
  if (!sw.assetIngestEnabled) {
    return json(501, {
      error: "asset_ingest_disabled",
      flag: sw.assetFlag,
      note: "Unpaid asset ingest requires HEYGEN_ALLOW_ASSET_INGEST=TRUE.",
    });
  }

  try {
    const result = await runPhaseAIngest(deps, { userId: user.id, twinId, idempotencyKey, explicitRequest: true });
    return json(result.http, result.body);
  } catch {
    // unexpected: sanitized, no provider detail, no key
    return json(500, { error: "INGEST_INTERNAL_ERROR" });
  }
});
