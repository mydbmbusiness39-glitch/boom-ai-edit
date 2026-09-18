/**
 * Capability model for the AI Twin product layer.
 *
 * Miya-safety is enforced HERE, server-side, and is the only place that decides what a
 * caller may do. The UI hides what the caller cannot use, but the UI is never the gate.
 *
 * What no non-admin caller can EVER reach, by construction:
 *   - provider API keys            → server-side env only, never returned by any endpoint
 *   - raw kill switches            → HEYGEN_ALLOW_* live in edge secrets, not in any API
 *   - unrestricted spend controls  → the ceiling is a module constant, not a parameter
 *   - avatar deletion              → no such endpoint exists in this product layer
 *   - consent modification         → only the twin owner's own revoke path
 */

export const CAPABILITIES = [
  "twin.view",       // see your own twin's status (setup page)
  "twin.generate",   // run a talking-head generation with an APPROVED twin
  "twin.admin",      // activate/rollback versions, start an upgrade
  "twin.spend.admin" // change spend settings (owner only)
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type TwinRole = "owner_admin" | "twin_operator" | "viewer" | "unknown";

/** Role → capabilities. New roles must be added explicitly; never grant by default. */
const ROLE_CAPABILITIES: Record<TwinRole, Capability[]> = {
  owner_admin: ["twin.view", "twin.generate", "twin.admin", "twin.spend.admin"],
  // Miya sits here: an `ai_twin`-entitled operator (profiles.plan business/agency) can
  // select an approved twin and generate — and nothing else.
  twin_operator: ["twin.view", "twin.generate"],
  viewer: ["twin.view"],
  unknown: []
};

export function capabilitiesForRole(role: TwinRole): Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

export function can(role: TwinRole, capability: Capability): boolean {
  return capabilitiesForRole(role).includes(capability);
}

export interface AuthzDenied {
  ok: false;
  http: number;
  /** Simple, user-facing. Never mentions roles, policies, or provider internals. */
  userMessage: string;
  code: string;
}

export interface AuthzAllowed {
  ok: true;
  role: TwinRole;
  capabilities: Capability[];
}

/**
 * Gate an action. Denials return the plain-language message the product shows,
 * while the caller keeps the technical code for sanitized server logs only.
 */
export function authorize(role: TwinRole, capability: Capability): AuthzAllowed | AuthzDenied {
  if (role === "unknown") {
    return { ok: false, http: 401, userMessage: "Please sign in again.", code: "NOT_AUTHENTICATED" };
  }
  if (!can(role, capability)) {
    // Deliberately generic: a non-admin must not learn what admin actions exist.
    return {
      ok: false,
      http: 403,
      userMessage: capability === "twin.generate"
        ? "You do not have access to generate with this twin."
        : "This action is not available on your account.",
      code: `FORBIDDEN:${capability}`
    };
  }
  return { ok: true, role, capabilities: capabilitiesForRole(role) };
}

/**
 * Map a row from public.profiles onto a role. Mirrors src/lib/access.ts exactly
 * (role 'owner_admin' or plan 'enterprise_internal' ⇒ owner) and FAILS CLOSED: an absent
 * profile is `unknown`, which holds no capabilities at all.
 */
export function roleFromProfile(profile: {
  role?: string | null;
  plan?: string | null;
  tier?: string | null;
} | null | undefined, ownerUserId?: string, callerUserId?: string): TwinRole {
  if (!profile) return "unknown";
  const role = (profile.role || "").trim();
  const plan = (profile.plan || profile.tier || "").trim();
  if (role === "owner_admin" || plan === "enterprise_internal") return "owner_admin";
  if (ownerUserId && callerUserId && callerUserId === ownerUserId) return "owner_admin";
  // ai_twin-entitled operators (business/agency) may generate with an approved twin.
  if (plan === "business" || plan === "agency") return "twin_operator";
  if (role === "customer") return "viewer";
  return "unknown";
}
