/**
 * Account entitlements — mirrors public.account_entitlements(uuid).
 * Authoritative source is profiles.role + profiles.plan (DB).
 * create-job quota uses the SQL function, not this module.
 * Email-string owner hacks are retired.
 */

export type AccountRole = "customer" | "owner_admin";
export type AccountPlan =
  | "free"
  | "pro"
  | "business"
  | "agency"
  | "enterprise_internal";

export type Entitlements = {
  role: AccountRole;
  plan: AccountPlan;
  dailyJobLimit: number | null;
  watermark: boolean;
  aiTwin: boolean;
  socialPublish: boolean;
  adminTest: boolean;
  paidTranscriptionAllowed: boolean;
  autoTranscription: boolean;
};

export type ProfileTierFields = {
  role?: string | null;
  plan?: string | null;
  tier?: string | null;
};

const CUSTOMER_PLANS: AccountPlan[] = ["free", "pro", "business", "agency"];

export function resolveEntitlements(profile: ProfileTierFields | null | undefined): Entitlements {
  const roleRaw = (profile?.role || "customer").trim();
  const planRaw = (profile?.plan || profile?.tier || "free").trim();

  if (roleRaw === "owner_admin" || planRaw === "enterprise_internal") {
    return {
      role: "owner_admin",
      plan: "enterprise_internal",
      dailyJobLimit: null,
      watermark: false,
      aiTwin: true,
      socialPublish: true,
      adminTest: true,
      paidTranscriptionAllowed: true,
      autoTranscription: true,
    };
  }

  const plan = (CUSTOMER_PLANS.includes(planRaw as AccountPlan) ? planRaw : "free") as AccountPlan;
  if (plan === "free") {
    return {
      role: "customer",
      plan: "free",
      dailyJobLimit: 5,
      watermark: true,
      aiTwin: false,
      socialPublish: false,
      adminTest: false,
      paidTranscriptionAllowed: false,
      autoTranscription: false,
    };
  }
  return {
    role: "customer",
    plan,
    dailyJobLimit: null,
    watermark: false,
    aiTwin: plan === "business" || plan === "agency",
    socialPublish: plan === "business" || plan === "agency",
    adminTest: false,
    paidTranscriptionAllowed: false,
    autoTranscription: false,
  };
}

export function isOwnerAdmin(profile: ProfileTierFields | null | undefined): boolean {
  return resolveEntitlements(profile).role === "owner_admin";
}

/** @deprecated Quota is SQL account_entitlements. Prefer isOwnerAdmin(profile). */
export function isOwner(_email: string | null | undefined): boolean {
  return false;
}

/** @deprecated Use resolveEntitlements(profile).plan */
export function getEffectivePlan(profile: ProfileTierFields | null | undefined): AccountPlan {
  return resolveEntitlements(profile).plan;
}
