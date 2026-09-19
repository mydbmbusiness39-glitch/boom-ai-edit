/**
 * Twin Setup + Use Twin — the AI Twin product surface.
 *
 * Deliberately plain markup (no new component dependencies). Every capability check here is
 * cosmetic: the server enforces all of them. Nothing on this page can spend money without
 * an explicit click that goes through the server's spend gate.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TwinApiError, activateVersion, bootstrapTwinOperation, compareVersions, generateTwinVideo,
  getTwinState, rollbackVersion, sendToTimeline, type TwinStateView,
} from "@/lib/twinApi";

const CARD = "rounded-xl border border-white/10 bg-white/[0.03] p-5";
const BTN = "rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
const BTN_PRIMARY = `${BTN} bg-emerald-500 text-black hover:bg-emerald-400`;
const BTN_GHOST = `${BTN} border border-white/15 text-white hover:bg-white/10`;
const BTN_DANGER = `${BTN} border border-red-500/40 text-red-300 hover:bg-red-500/10`;

function Field({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "warn" | "muted" }) {
  const color = tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-white/70";
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className={`text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}

export default function TwinSetupPage() {
  const [state, setState] = useState<TwinStateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [script, setScript] = useState("");
  const [audioMode, setAudioMode] = useState<"script" | "existing">("script");
  const [audioDurationS, setAudioDurationS] = useState(5.5);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [compare, setCompare] = useState<Set<number>>(new Set());
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [lastClip, setLastClip] = useState<{ src: string; operationId: string; durationS: number } | null>(null);
  // Inline status shown right next to the Generate button, so a failure is never invisible.
  const [gen, setGen] = useState<{ state: "idle" | "preparing" | "generating" | "complete" | "failed"; note: string }>(
    { state: "idle", note: "Ready" }
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      setState(await getTwinState(undefined, audioMode === "existing" ? audioDurationS : Math.max(1, script.length / 14)));
    } catch (e) {
      setError(e instanceof TwinApiError ? e.message : "Twin unavailable");
    }
  }, [audioMode, audioDurationS, script.length]);

  useEffect(() => { void load(); }, [load]);

  const twin = state?.twin;
  const preview = state?.costPreview;
  const isAdmin = state?.capabilities.includes("twin.admin") ?? false;
  const canGenerate = state?.capabilities.includes("twin.generate") ?? false;

  const blockers = useMemo(() => {
    if (!state) return ["Loading…"];
    const out: string[] = [];
    if (twin?.consentStatus === "required") out.push("Consent required");
    if (twin?.entitlementStatus !== "active") out.push("Twin unavailable");
    if (twin?.providerStatus === "unavailable") out.push("Provider temporarily unavailable");
    if (preview?.blockedReason) out.push(preview.blockedReason);
    if (state.capabilities.length === 0) out.push("Twin unavailable");
    return out;
  }, [state, twin, preview]);

  /** Friendly wording only — raw provider/edge codes are never surfaced to the user. */
  function friendlyFailure(e: unknown): string {
    const code = e instanceof TwinApiError ? e.code : "";
    if (/disabled/i.test(code)) return "Generation is temporarily unavailable.";
    if (e instanceof TwinApiError && e.status === 402) return "Spend limit reached";
    return "Generation failed";
  }

  async function onGenerate() {
    if (!twin) return;
    setBusy(true); setError(null);
    try {
      if (!state?.boundAssetId) {
        setGen({ state: "failed", note: "Generation failed" });
        setError("Twin unavailable"); // nothing to bind — never fall through to a paid call
        return;
      }

      // STEP 1 (unpaid): bootstrap the operation against the twin's EXISTING asset.
      setGen({ state: "preparing", note: "Preparing…" });
      const boot = await bootstrapTwinOperation(twin.id, state.boundAssetId);
      if (boot.providerCalls !== 0 || (boot.avatarSource ?? "") !== "twin_persisted") {
        setGen({ state: "failed", note: "Generation failed" });
        setError("Generation failed");
        return;
      }

      // STEP 2 (paid, exactly once): the proven generation step for the bootstrapped operation.
      setGen({ state: "generating", note: "Generating…" });
      const res = await generateTwinVideo(twin.id, { operationId: boot.operationId, idempotencyKey: boot.idempotencyKey });
      if (res.status === "queued" || res.status === "video_requested") {
        setLastClip({ src: res.videoUrl ?? "", operationId: boot.operationId, durationS: res.audioDurationS ?? 5.5 });
        setGen({ state: "complete", note: "Complete" });
      } else {
        setGen({ state: "failed", note: "Generation failed" });
      }
      await load();
    } catch (e) {
      const note = friendlyFailure(e);
      setGen({ state: "failed", note });
      setError(note);
    } finally { setBusy(false); }
  }

  async function onSendToTimeline() {
    if (!lastClip?.src) return;
    setBusy(true); setError(null);
    try {
      await sendToTimeline({
        id: `twin-${Date.now()}`, type: "video", track: 0,
        start_time: 0, end_time: lastClip.durationS,
        content: { src: lastClip.src, duration: lastClip.durationS, has_audio: true },
      });
    } catch (e) {
      setError(e instanceof TwinApiError ? e.message : "Generation failed");
    } finally { setBusy(false); }
  }

  async function onVersionAction(action: "activate" | "rollback", version?: number) {
    if (!twin) return;
    setBusy(true); setError(null);
    try {
      await (action === "activate" ? activateVersion(twin.id, version!) : rollbackVersion(twin.id));
      await load();
    } catch (e) {
      setError(e instanceof TwinApiError ? e.message : "Twin unavailable");
    } finally { setBusy(false); }
  }

  async function onCompare() {
    if (!twin || compare.size !== 2) return;
    const [a, b] = [...compare];
    try {
      const r = await compareVersions(twin.id, a, b);
      setCompareResult(r.changes.length
        ? r.changes.map((c) => `${c.field}: ${c.from ?? "—"} → ${c.to ?? "—"}`).join(" · ") + (r.costNote ? ` · ${r.costNote}` : "")
        : "These versions are identical.");
    } catch (e) {
      setError(e instanceof TwinApiError ? e.message : "Twin unavailable");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-white">
      <header>
        <h1 className="text-2xl font-semibold">AI Twin</h1>
        <p className="mt-1 text-sm text-white/50">Your cloned voice and likeness, ready to use in a video.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className={CARD}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Twin status</h2>
        <Field label="Twin name" value={twin?.name ?? "—"} />
        <Field label="Version" value={twin?.twinVersionLabel ?? "—"} tone="ok" />
        <Field label="Visual avatar" value={twin?.visualAvatarStatus === "ready" ? `Ready ${twin.visualAvatarId ?? ""}` : "Not created"}
               tone={twin?.visualAvatarStatus === "ready" ? "ok" : "warn"} />
        <Field label="Voice" value={twin?.voice ?? "—"} tone="ok" />
        <Field label="Consent" value={twin?.consentStatus === "granted" ? `Granted (${twin.consentVersion ?? "v1"})` : "Required"}
               tone={twin?.consentStatus === "granted" ? "ok" : "warn"} />
        <Field label="Entitlement" value={twin?.entitlementStatus === "active" ? "Active" : "Inactive"}
               tone={twin?.entitlementStatus === "active" ? "ok" : "warn"} />
        <Field label="Provider" value={twin?.providerStatus === "available" ? "Available" : "Unavailable"}
               tone={twin?.providerStatus === "available" ? "ok" : "warn"} />
        <Field label="Last successful generation" value={state?.lastSuccessfulGeneration?.completedAt
          ? new Date(state.lastSuccessfulGeneration.completedAt).toLocaleString() : "None yet"}
          tone={state?.lastSuccessfulGeneration ? "ok" : "muted"} />
      </section>

      <section className={CARD}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Twin versions</h2>
        <ul className="space-y-2">
          {state?.versions.map((v) => (
            <li key={v.version} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 px-3 py-2">
              <label className="flex items-center gap-3">
                {v.status !== "active" && isAdmin && (
                  <input type="checkbox" className="h-4 w-4"
                    checked={compare.has(v.version)}
                    onChange={(e) => {
                      const next = new Set(compare);
                      e.target.checked ? next.add(v.version) : next.delete(v.version);
                      setCompare(next);
                    }} />
                )}
                <span className="text-sm">
                  {v.label}
                  {v.status === "active" && <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">active</span>}
                </span>
              </label>
              <span className="flex items-center gap-2">
                <span className="text-xs text-white/40">avatar {v.visualAvatarId ?? "—"}</span>
                {isAdmin && v.status !== "active" && (
                  <button className={BTN_GHOST} disabled={busy} onClick={() => onVersionAction("activate", v.version)}>Activate</button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className={BTN_GHOST} disabled={busy || compare.size !== 2} onClick={onCompare}>Compare selected</button>
            <button className={BTN_GHOST} disabled={busy} onClick={() => onVersionAction("rollback")}>Roll back to previous</button>
          </div>
        )}
        {compareResult && <p className="mt-3 text-xs text-white/60">{compareResult}</p>}
        <p className="mt-3 text-xs text-white/40">
          Switching versions never creates or deletes an avatar — it only changes which saved
          version your videos use.
        </p>
      </section>

      <section className={CARD}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Use twin in video</h2>
        <div className="mb-3 flex gap-2">
          <button className={audioMode === "script" ? BTN_PRIMARY : BTN_GHOST} onClick={() => setAudioMode("script")}>Write a script</button>
          <button className={audioMode === "existing" ? BTN_PRIMARY : BTN_GHOST} onClick={() => setAudioMode("existing")}>Use existing narration</button>
        </div>
        {audioMode === "script" ? (
          <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={4}
            placeholder="Type what your twin should say…"
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-emerald-500/50" />
        ) : (
          <label className="block text-sm text-white/60">
            Narration length (seconds)
            <input type="number" min={1} max={30} step={0.1} value={audioDurationS}
              onChange={(e) => setAudioDurationS(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none" />
          </label>
        )}

        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-white/60">Estimated cost</span>
            <span className="text-lg font-semibold">{preview?.estimatedDisplay ?? "—"}</span>
          </div>
          <ul className="mt-2 space-y-1">
            {preview?.breakdown.map((b) => (
              <li key={b.label} className="flex justify-between text-xs text-white/40">
                <span>{b.label}</span><span>${(b.minor / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-white/40">
            Limit per generation {preview?.ceilingDisplay ?? "$3.00"}
            {preview?.avatarReused && " · reuses your existing avatar (no avatar charge)"}
          </p>
        </div>

        {blockers.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-amber-300">
            {blockers.map((b) => <li key={b}>• {b}</li>)}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={BTN_PRIMARY} disabled={busy || blockers.length > 0 || !canGenerate || !twin} onClick={onGenerate}>
            {busy ? "Working…" : "Generate talking-head video"}
          </button>
          <button className={BTN_GHOST} disabled={busy || !lastClip} onClick={onSendToTimeline}>
            Send to timeline
          </button>

          {/* Inline status — directly beside the button so a failure can never be missed. */}
          <span
            data-cy="twin-generate-status"
            role="status"
            aria-live="polite"
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium " +
              (gen.state === "failed"
                ? "border border-red-500/40 bg-red-500/10 text-red-200"
                : gen.state === "complete"
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : gen.state === "idle"
                    ? "border border-white/10 text-white/50"
                    : "border border-amber-500/40 bg-amber-500/10 text-amber-200")
            }
          >
            {gen.note}
          </span>
        </div>
        {!canGenerate && <p className="mt-2 text-xs text-amber-300">You do not have access to generate with this twin.</p>}
      </section>

      <section className={CARD}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button className={BTN_GHOST} disabled={!twin} onClick={() => setAudioMode("script")}>Use twin</button>
          {isAdmin && <button className={BTN_GHOST} onClick={() => setShowUpgrade(true)}>Upgrade twin</button>}
          {isAdmin && <button className={BTN_DANGER} disabled title="Available from the Twin settings page">Disable twin</button>}
        </div>
      </section>

      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-neutral-900 p-6 text-white">
            <h2 className="text-lg font-semibold">Upgrade twin</h2>
            <p className="mt-2 text-sm text-white/60">
              Improving realism means capturing better source media. You'll provide new likeness
              footage and a new voice recording; your current twin stays saved as{" "}
              <strong>{twin?.twinVersionLabel}</strong> and can be restored at any time.
            </p>
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              Creating a new visual likeness may incur a provider charge (approximately $1.32 for
              one avatar). Nothing is generated or charged until you confirm.
            </div>
            <ul className="mt-4 space-y-1 text-sm text-white/60">
              <li>• New likeness footage — well lit, facing the camera, 4K if possible</li>
              <li>• New voice recording — a clean sample for a fresh clone</li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button className={BTN_GHOST} onClick={() => setShowUpgrade(false)}>Cancel</button>
              <button className={BTN_PRIMARY} disabled title="Upload and processing arrive in the next release">
                Start upgrade
              </button>
            </div>
            <p className="mt-3 text-xs text-white/40">
              Upload and processing are not wired up yet — this screen is a preview.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
