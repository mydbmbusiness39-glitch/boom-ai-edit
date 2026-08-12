// Owner / Creator access — the boss gets everything, always.
// The owner account (Hopewana) has FULL access to every feature,
// no plan gating, no watermarks, no limits.

export const OWNER_EMAILS = [
  "mydbmbusiness39@gmail.com",
  "mydbmbusiness39-glitch", // github-style fallback
];

export function isOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return OWNER_EMAILS.some((o) => normalized === o.toLowerCase());
}

export function getEffectivePlan(email: string | null | undefined): "business" | "pro" | "free" {
  if (isOwner(email)) return "business"; // owner = everything unlocked
  return "free"; // everyone else starts free until payments wired
}
