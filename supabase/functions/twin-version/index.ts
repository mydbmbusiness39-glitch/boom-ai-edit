/**
 * AI Twin product layer — version management (list / compare / activate / rollback).
 *
 * OWNER-ONLY (`twin.admin`). Miya and every non-admin caller are refused here; that is the
 * enforcement point for "Miya cannot access admin controls", not the UI.
 *
 * Contacts NO provider and creates NO avatar: switching a version only moves which persisted
 * provider ids the twin points at, so it can never cost money.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorize, roleFromProfile } from "../_shared/twinVisual/capabilities.ts";
import { activateVersion, activeVersion, compareVersions, rollbackVersion, versionList } from "../_shared/twinVisual/twinVersions.ts";
import { sanitizeForLog, userError } from "../_shared/twinVisual/userErrors.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const COLUMNS = "id, name, status, voice_provider, voice_provider_id, visual_provider, visual_provider_id, " +
                "source_asset_path, created_at, twin_versions";

Deno.serve(async (req: Request) => {
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
  const { data: profile } = await service.from("profiles").select("role, plan").eq("id", user.id).maybeSingle();
  const role = roleFromProfile(profile);

  // Version administration is owner-only. Deny BEFORE reading anything about the twin.
  const authz = authorize(role, "twin.admin");
  if (!authz.ok) {
    console.log(`[twin-version] denied ${authz.code} user=${sanitizeForLog(user.id).slice(0, 8)}`);
    return json(authz.http, { ...userError("TWIN_UNAVAILABLE"), error: authz.code });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  const twinId = typeof body?.twinId === "string" ? body.twinId : "";
  if (!twinId) return json(400, { ...userError("TWIN_UNAVAILABLE"), error: "twinId required" });

  // Service read: an admin may act on the twin they administer.
  const { data: twin, error: twinErr } = await service.from("ai_twins").select(COLUMNS).eq("id", twinId).maybeSingle();
  if (twinErr) {
    if ((twinErr as { code?: string }).code === "42703") {
      // twin_versions column absent ⇒ the migration has not been applied yet.
      return json(501, { ...userError("TWIN_UNAVAILABLE", "Version history is being prepared."),
                         error: "VERSIONING_MIGRATION_PENDING" });
    }
    return json(404, { ...userError("TWIN_UNAVAILABLE"), error: "Twin not found" });
  }
  if (!twin) return json(404, { ...userError("TWIN_UNAVAILABLE"), error: "Twin not found" });

  const current = activeVersion(twin as never);

  /** Same masking rule as twin-state: never hand back a full provider id. */
  const fp = (id: string | null | undefined) =>
    !id ? null : id.length <= 8 ? `…${id}` : `…${id.slice(-8)}`;
  const maskList = (list: ReturnType<typeof versionList>) =>
    list.map((v) => ({
      version: v.version,
      label: v.label,
      status: v.version === current.version ? "active" : v.status,
      voiceId: fp(v.voiceProviderId),
      visualAvatarId: fp(v.visualProviderId),
      voiceProvider: v.voiceProvider,
      visualProvider: v.visualProvider,
      createdAt: v.createdAt,
      notes: v.notes ?? null
    }));

  if (action === "list") {
    return json(200, { ok: true, activeVersion: current.version, versions: maskList(versionList(twin as never)) });
  }

  if (action === "compare") {
    const a = Number(body?.a), b = Number(body?.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return json(400, { ...userError("TWIN_UNAVAILABLE"), error: "a and b version numbers required" });
    }
    try {
      const cmp = compareVersions(twin as never, a, b);
      // Mask the raw ids out of the field-level diff before it leaves the server.
      const changes = cmp.changes.map((c) => ({
        field: c.field,
        from: /Id$/.test(c.field) ? fp(c.from) : c.from,
        to: /Id$/.test(c.field) ? fp(c.to) : c.to
      }));
      return json(200, {
        ok: true,
        a: { version: cmp.a.version, label: cmp.a.label },
        b: { version: cmp.b.version, label: cmp.b.label },
        changes,
        visualChange: cmp.visualChange,
        costNote: cmp.visualChange ? "These versions use different visual avatars." : null
      });
    } catch (err) {
      return json(404, { ...userError("TWIN_UNAVAILABLE"), error: sanitizeForLog(err, 120) });
    }
  }

  if (action === "activate" || action === "rollback") {
    let mutation;
    try {
      mutation = action === "activate"
        ? activateVersion(twin as never, Number(body?.version))
        : rollbackVersion(twin as never);
    } catch (err) {
      return json(409, { ...userError("TWIN_UNAVAILABLE", "That version cannot be activated."),
                         error: sanitizeForLog(err, 120) });
    }
    const { error: upErr } = await service.from("ai_twins").update(mutation.persist).eq("id", twinId);
    if (upErr) {
      console.log(`[twin-version] persist failed: ${sanitizeForLog(upErr)}`);
      if ((upErr as { code?: string }).code === "42703" || (upErr as { code?: string }).code === "23514") {
        return json(501, { ...userError("TWIN_UNAVAILABLE", "Version history is being prepared."),
                           error: "VERSIONING_MIGRATION_PENDING" });
      }
      return json(500, { ...userError("GENERATION_FAILED"), error: "VERSION_PERSIST_FAILED" });
    }
    console.log(`[twin-version] ${action} v${current.version} -> v${mutation.active.version} twin=${twinId.slice(0, 8)}`);
    return json(200, {
      ok: true,
      activeVersion: mutation.active.version,
      activeVersionLabel: mutation.active.label,
      versions: mutation.list,
      // Honest and useful: an activation never creates or deletes a provider asset.
      note: "No avatar was created or deleted. This only changed which version is active."
    });
  }

  return json(400, { ...userError("TWIN_UNAVAILABLE"), error: `Unknown action: ${sanitizeForLog(action, 40)}` });
});
