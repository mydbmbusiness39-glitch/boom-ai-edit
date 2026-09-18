/**
 * Twin versioning: v1 is the proven Gate #79 baseline and is NEVER overwritten.
 *
 * Storage model: a `twin_versions` jsonb array on the twin row (see
 * supabase/migrations/20260918140000_twin_product_versions.sql — written, NOT applied).
 * The twin's own voice_provider_id / visual_provider_id columns always describe the
 * ACTIVE version, so every existing code path (and the proven generation flow) keeps
 * working unchanged whether or not the migration has been applied.
 *
 * All operations here are pure: they take the current list and return the new list plus
 * the ids the caller should persist. No provider is ever contacted, so version switching
 * cannot cost money and cannot create an avatar.
 */

export interface TwinVersionRecord {
  version: number;
  label: string;
  status: "proven" | "candidate" | "active" | "retired";
  voiceProvider: string | null;
  voiceProviderId: string | null;
  visualProvider: string | null;
  visualProviderId: string | null;
  sourceAssetPath?: string | null;
  createdAt: string;
  notes?: string;
  measurements?: Record<string, number> | null;
}

export interface TwinRowLike {
  id: string;
  status?: string | null;
  voice_provider?: string | null;
  voice_provider_id?: string | null;
  visual_provider?: string | null;
  visual_provider_id?: string | null;
  source_asset_path?: string | null;
  created_at?: string | null;
  twin_versions?: TwinVersionRecord[] | null;
}

export const BASELINE_VERSION = 1;
export const BASELINE_LABEL = "v1 · proven baseline";

/** Build the v1 record from the twin's LIVE columns. Read-only by construction. */
export function baselineFromTwin(row: TwinRowLike): TwinVersionRecord {
  return {
    version: BASELINE_VERSION,
    label: BASELINE_LABEL,
    status: "proven",
    voiceProvider: row.voice_provider ?? null,
    voiceProviderId: row.voice_provider_id ?? null,
    visualProvider: row.visual_provider ?? null,
    visualProviderId: row.visual_provider_id ?? null,
    sourceAssetPath: row.source_asset_path ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    notes: "Gate #79 end-to-end proven: consent → Hope voice → private likeness → photo avatar → lip-synced 1080x1920 → Boom render."
  };
}

/**
 * The version list, always containing v1 first. If the migration is not applied (or the
 * array is empty) v1 is synthesised from the live columns so the UI is never blank.
 */
export function versionList(row: TwinRowLike): TwinVersionRecord[] {
  const stored = Array.isArray(row.twin_versions) ? row.twin_versions.filter(Boolean) : [];
  const baseline = stored.find((v) => v.version === BASELINE_VERSION) ?? baselineFromTwin(row);
  const rest = stored.filter((v) => v.version !== BASELINE_VERSION).sort((a, b) => a.version - b.version);
  return [baseline, ...rest];
}

/** The version the twin's live columns currently point at, matched by VISUAL provider id.
 *  A version is identified by its avatar; the voice id only disambiguates when two versions
 *  share an avatar (e.g. a v2 that changed the voice but kept the proven likeness). */
export function activeVersion(row: TwinRowLike): TwinVersionRecord {
  const list = versionList(row);
  const candidates = list.filter((v) => v.visualProviderId !== null && v.visualProviderId === row.visual_provider_id);
  const match =
    candidates.find((v) => !row.voice_provider_id || v.voiceProviderId === row.voice_provider_id) ?? candidates[0];
  if (match) return { ...match, status: "active" };
  // Nothing matches ⇒ the live ids belong to the baseline (the proven state).
  return { ...list[0], status: "active" };
}

export interface VersionComparison {
  a: TwinVersionRecord;
  b: TwinVersionRecord;
  changes: { field: string; from: string | null; to: string | null }[];
  /** True when the two versions differ in the visual likeness (⇒ a different avatar cost). */
  visualChange: boolean;
}

export function compareVersions(row: TwinRowLike, aVersion: number, bVersion: number): VersionComparison {
  const list = versionList(row);
  const a = list.find((v) => v.version === aVersion);
  const b = list.find((v) => v.version === bVersion);
  if (!a || !b) throw new Error(`VERSION_NOT_FOUND: ${aVersion} / ${bVersion}`);
  const fields: (keyof TwinVersionRecord)[] = ["voiceProviderId", "visualProviderId", "visualProvider", "sourceAssetPath"];
  const changes = fields
    .filter((f) => (a[f] ?? null) !== (b[f] ?? null))
    .map((f) => ({ field: String(f), from: (a[f] ?? null) as string | null, to: (b[f] ?? null) as string | null }));
  return { a, b, changes, visualChange: (a.visualProviderId ?? null) !== (b.visualProviderId ?? null) };
}

export interface VersionMutation {
  list: TwinVersionRecord[];
  active: TwinVersionRecord;
  /** What the caller must persist onto the twin row. */
  persist: {
    voice_provider: string | null;
    voice_provider_id: string | null;
    visual_provider: string | null;
    visual_provider_id: string | null;
    twin_versions: TwinVersionRecord[];
  };
}

/**
 * Activate a version. Refuses unknown or retired versions and any attempt to mutate v1's
 * identity fields, so the proven baseline cannot be silently rewritten.
 */
export function activateVersion(row: TwinRowLike, version: number): VersionMutation {
  const list = versionList(row);
  const target = list.find((v) => v.version === version);
  if (!target) throw new Error(`VERSION_NOT_FOUND: ${version}`);
  if (target.status === "retired") throw new Error(`VERSION_RETIRED: ${version}`);
  if (!target.visualProviderId && target.version !== BASELINE_VERSION) {
    throw new Error(`VERSION_INCOMPLETE: ${version}`);
  }
  const next: TwinVersionRecord[] = list.map((v) => ({
    ...v,
    status: v.version === version ? "active" : (v.status === "active" ? "proven" : v.status)
  }));
  const active = next.find((v) => v.version === version)!;
  return {
    list: next,
    active,
    persist: {
      voice_provider: active.voiceProvider,
      voice_provider_id: active.voiceProviderId,
      visual_provider: active.visualProvider,
      visual_provider_id: active.visualProviderId,
      twin_versions: next
    }
  };
}

/** Roll back to the previously active version (or v1 when there is no history). */
export function rollbackVersion(row: TwinRowLike): VersionMutation {
  const list = versionList(row);
  const current = activeVersion(row);
  const candidates = list.filter((v) => v.version !== current.version && v.status !== "retired");
  const previous = candidates.length
    ? candidates.reduce((best, v) => {
        const bestIsBaseline = best.version === BASELINE_VERSION;
        const vIsBaseline = v.version === BASELINE_VERSION;
        if (bestIsBaseline) return best;
        if (vIsBaseline) return v;
        return v.version < best.version ? v : best;
      })
    : list[0];
  return activateVersion(row, previous.version);
}

/** Add a candidate version (used later by the upgrade flow). Baseline fields are immutable. */
export function addCandidate(row: TwinRowLike, candidate: Omit<TwinVersionRecord, "version" | "status" | "label">): VersionMutation {
  const list = versionList(row);
  const nextVersion = Math.max(...list.map((v) => v.version)) + 1;
  const record: TwinVersionRecord = {
    ...candidate,
    version: nextVersion,
    status: "candidate",
    label: `v${nextVersion} · candidate`
  };
  const next = [...list, record];
  const current = activeVersion(row);
  return {
    list: next,
    active: current,
    persist: {
      voice_provider: row.voice_provider ?? null,
      voice_provider_id: row.voice_provider_id ?? null,
      visual_provider: row.visual_provider ?? null,
      visual_provider_id: row.visual_provider_id ?? null,
      twin_versions: next
    }
  };
}
