import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const started = Date.now();
  try {
    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const aiWorkerUrl = Deno.env.get("AI_WORKER_URL") || Deno.env.get("AI_Worker_URL");
    const aiWorkerToken = Deno.env.get("AI_WORKER_API_KEY") ||
      Deno.env.get("AI_WORKER_TOKEN") ||
      Deno.env.get("AI_Worker_API_key");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "No authorization header" });
    }

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse(401, { error: "User not authenticated" });
    }

    const { data: entitlementRows, error: entitlementError } = await userSupabase
      .rpc("account_entitlements", { user_uuid: user.id });
    if (entitlementError || !entitlementRows || entitlementRows.length === 0) {
      console.log("[TRANSCRIBE] entitlements missing", {
        userId: user.id,
        error: entitlementError?.message || "no row",
      });
      return jsonResponse(403, { error: "Paid transcription is not included in your plan." });
    }
    const entitlements = entitlementRows[0];
    const allowed = entitlements.paid_transcription_allowed === true;
    console.log("[TRANSCRIBE] request", {
      userId: user.id,
      role: entitlements.role,
      plan: entitlements.plan,
      paid_transcription_allowed: allowed,
      auto_transcription: entitlements.auto_transcription === true,
      contentType: req.headers.get("content-type"),
      contentLength: req.headers.get("content-length"),
      provider: "openai",
      model: "whisper-1",
    });
    if (!allowed) {
      return jsonResponse(403, { error: "Paid transcription is not included in your plan." });
    }

    if (!aiWorkerUrl || !aiWorkerToken) {
      return jsonResponse(500, { error: "Transcription provider unavailable: worker not configured" });
    }

    const contentType = req.headers.get("content-type") || "";
    const workerHeaders = new Headers();
    workerHeaders.set("Authorization", `Bearer ${aiWorkerToken}`);
    workerHeaders.set("X-Boom-Paid-Transcription", "entitled");
    if (contentType) workerHeaders.set("Content-Type", contentType);

    // One provider call per approved request. No retry.
    const workerRes = await fetch(`${aiWorkerUrl}/transcribe`, {
      method: "POST",
      headers: workerHeaders,
      body: req.body,
    });
    const text = await workerRes.text();
    console.log("[TRANSCRIBE] worker response", {
      userId: user.id,
      workerStatus: workerRes.status,
      elapsed_ms: Date.now() - started,
      provider: "openai",
      model: "whisper-1",
      retry: false,
    });
    return new Response(text, {
      status: workerRes.status,
      headers: {
        ...corsHeaders,
        "Content-Type": workerRes.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[TRANSCRIBE] exception", {
      name: error?.name || "unknown",
      message: error?.message || "unknown",
      elapsed_ms: Date.now() - started,
    });
    return jsonResponse(500, {
      error: "Transcription provider unavailable",
      message: error?.message || "unknown",
    });
  }
});
