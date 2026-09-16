/**
 * Client-side AI worker pre-warm.
 *
 * Cloud Run runs the ai-worker with NO min-instances (scale-to-zero), maxScale 1
 * and containerConcurrency 1, and the container needs ~17-22s to become ready.
 * A BOOM press that lands while there are zero ready instances is aborted by
 * Cloud Run ("The request was aborted because there was no available instance")
 * before any app code runs, which surfaces to the user as
 * "Timeline compile failed".
 *
 * Warming the worker when the Editor mounts closes that window. The wake is:
 *   - authenticated (it goes through the ai-worker-proxy, which injects the
 *     worker bearer token; the worker token is never exposed to the browser)
 *   - on the existing lightweight `/health` route
 *   - NOT /timeline/compile (no compile work is triggered)
 *   - single-flight: exactly ONE request per page load, so React StrictMode
 *     double-invoked effects or repeated mounts cannot duplicate it
 *   - silent: it never rejects and never produces user-visible UI
 */

/** Worker route used to wake the instance. The lightest existing route. */
export const PREWARM_PATH = "/health";

/** Injected transport. Resolves for any HTTP response (even a non-2xx). */
export type PrewarmInvoke = (body: Record<string, unknown>) => Promise<unknown>;

/**
 * Build a single-flight pre-warm function.
 *
 * The first call issues the wake request; every later call — including
 * concurrent ones — reuses that same in-flight/resolved promise.
 */
export function createPrewarmer(invoke: PrewarmInvoke): () => Promise<boolean> {
  let started: Promise<boolean> | null = null;

  return function prewarm(): Promise<boolean> {
    if (!started) {
      started = invoke({ path: PREWARM_PATH })
        .then(() => true)
        // Pre-warm failures must never surface: a cold worker is survivable,
        // a user-visible error is not.
        .catch(() => false);
    }
    return started;
  };
}
