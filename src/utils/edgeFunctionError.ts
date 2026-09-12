/**
 * supabase-js FunctionsHttpError.message is always
 * "Edge Function returned a non-2xx status code".
 * The real body is on error.context (the Response) as { error: string }.
 */
export async function readEdgeFunctionError(error: unknown): Promise<string> {
  const err = error as { message?: string; context?: unknown } | null;
  const fallback = (err && typeof err.message === "string" && err.message) || "Unknown error";
  const ctx = err?.context as
    | { json?: () => Promise<unknown>; clone?: () => { json?: () => Promise<unknown> }; error?: string }
    | undefined;
  if (!ctx) return fallback;
  try {
    if (typeof ctx.error === "string" && ctx.error.trim()) {
      return ctx.error;
    }
    const reader = ctx.clone && typeof ctx.clone === "function" ? ctx.clone() : ctx;
    if (reader && typeof reader.json === "function") {
      const body = await reader.json();
      if (body && typeof (body as { error?: unknown }).error === "string") {
        const msg = ((body as { error: string }).error || "").trim();
        if (msg) return msg;
      }
    }
  } catch {
    /* keep fallback */
  }
  return fallback;
}
