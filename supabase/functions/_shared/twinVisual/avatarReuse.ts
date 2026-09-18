/**
 * Avatar resolution for Phase B — the load-bearing rule that a twin's EXISTING avatar is
 * never re-bought.
 *
 * History (2026-09-18 canary): Phase B seeded `avatarId` only from the operation snapshot.
 * A fresh operation has no snapshot avatar, so `if (!avatarId)` was true and the flow would
 * call createAvatarFromAsset — spending $1.32 on an avatar the twin already owned. The twin's
 * `visual_provider_id` was populated the whole time.
 *
 * Order of authority:
 *   1. the operation snapshot (what this run already resolved) — continuity for retries
 *   2. the twin's persisted avatar (v1's proven avatar)       — the account already owns it
 *   3. nothing                                                — the ONE case creation is allowed
 *
 * `conflict` marks the impossible state (twin HAS an avatar but resolution found none). The
 * caller must FAIL CLOSED on it rather than create: today that combination cannot occur, and
 * if it ever does, creating would silently break NEW_AVATAR_CREATED = NO.
 */

export interface AvatarResolution {
  avatarId: string | null;
  lookId: string | null;
  source: "snapshot" | "twin" | "none";
  /** True when the twin has a persisted avatar that resolution failed to pick up. */
  conflict: boolean;
  /** True only when creation is legitimately the only option. */
  creationAllowed: boolean;
}

export function resolveAvatar(input: {
  snapAvatarId?: string | null;
  snapLookId?: string | null;
  twinVisualProviderId?: string | null;
}): AvatarResolution {
  const snapAvatar = (input.snapAvatarId ?? "").trim() || null;
  const snapLook = (input.snapLookId ?? "").trim() || null;
  const twinAvatar = (input.twinVisualProviderId ?? "").trim() || null;

  if (snapAvatar || snapLook) {
    return {
      avatarId: snapAvatar ?? twinAvatar,
      lookId: snapLook ?? snapAvatar ?? twinAvatar,
      source: "snapshot",
      conflict: false,
      creationAllowed: false
    };
  }

  if (twinAvatar) {
    // Reuse the persisted avatar. Creation is NOT reached — this is the fix.
    return { avatarId: twinAvatar, lookId: twinAvatar, source: "twin", conflict: false, creationAllowed: false };
  }

  return { avatarId: null, lookId: null, source: "none", conflict: false, creationAllowed: true };
}

/**
 * The hard assertion, checked immediately before any create-avatar provider call.
 * Returns a refusal reason when creating would be wrong.
 */
export function guardAgainstNeedlessAvatarCreate(
  resolution: AvatarResolution,
  twinVisualProviderId?: string | null
): string | null {
  const twinAvatar = (twinVisualProviderId ?? "").trim() || null;
  if (resolution.avatarId || resolution.lookId) return null; // nothing to create
  if (twinAvatar) return "AVATAR_REUSE_RESOLUTION_FAILED"; // would buy a duplicate
  return null; // legitimately none: creation allowed
}
