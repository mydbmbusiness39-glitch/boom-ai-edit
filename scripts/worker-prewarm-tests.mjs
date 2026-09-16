#!/usr/bin/env node
/**
 * AI worker pre-warm tests.
 *
 * Executes the real TypeScript module (transpiled with the repo's esbuild) against
 * an injected transport, so the single-flight behaviour is proven, not grepped.
 * Static source assertions are marked as such.
 *
 * Usage: node scripts/worker-prewarm-tests.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "boom-prewarm-"));

async function loadTs(rel) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const { code } = transformSync(src, { loader: "ts", format: "esm", target: "es2020" });
  const out = join(dir, rel.replace(/[\\/]/g, "_").replace(/\.ts$/, ".mjs"));
  writeFileSync(out, code);
  return import(`file://${out}`);
}

let pass = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    pass++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    pass++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
function eq(a, b, l = "") {
  if (a !== b) throw new Error(`${l}expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function ok(c, m) {
  if (!c) throw new Error(m || "expected truthy");
}

const prewarmMod = await loadTs("src/lib/workerPrewarm.ts");
const clientSrc = readFileSync(join(ROOT, "src/utils/aiWorkerClient.ts"), "utf8");
const editorSrc = readFileSync(join(ROOT, "src/pages/Editor.tsx"), "utf8");

/* ---------------------------------------------------- SINGLE-FLIGHT ------ */
console.log("\n=== SINGLE-FLIGHT (exactly one wake per page load) ===");

await checkAsync("repeated calls issue exactly ONE request", async () => {
  let calls = 0;
  const prewarm = prewarmMod.createPrewarmer(async () => {
    calls++;
    return { ok: true };
  });
  await prewarm();
  await prewarm();
  await prewarm();
  await prewarm();
  await prewarm();
  eq(calls, 1, "invoke count: ");
});

await checkAsync("concurrent calls issue exactly ONE request", async () => {
  let calls = 0;
  const prewarm = prewarmMod.createPrewarmer(async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 5));
    return { ok: true };
  });
  await Promise.all([prewarm(), prewarm(), prewarm(), prewarm()]);
  eq(calls, 1, "invoke count: ");
});

await checkAsync("separate prewarmers each issue their own request (page-load semantics)", async () => {
  let calls = 0;
  const mk = () =>
    prewarmMod.createPrewarmer(async () => {
      calls++;
      return {};
    });
  await mk()();
  await mk()();
  eq(calls, 2, "invoke count: ");
});

await checkAsync("IMMEDIATE BOOM: reuses the in-flight mount wake, and waits for it", async () => {
  let calls = 0;
  let releaseInvoke = null;
  const prewarm = prewarmMod.createPrewarmer(() => {
    calls++;
    return new Promise((r) => {
      releaseInvoke = r;
    });
  });

  const mount = prewarm(); // Editor mount fires the wake
  const boom = prewarm();  // BOOM pressed immediately, wake still in flight

  eq(calls, 1, "exactly one wake request: ");

  let boomResolved = false;
  boom.then(() => {
    boomResolved = true;
  });
  await new Promise((r) => setTimeout(r, 25));
  eq(boomResolved, false, "BOOM must still be waiting while the wake is in flight");

  releaseInvoke({});
  const value = await boom;
  eq(calls, 1, "still exactly one wake request: ");
  eq(boomResolved, true, "BOOM must be released once the wake resolves");
  eq(value, true, "wake reported as done: ");
  await mount;
});

await checkAsync("failed pre-warm releases BOOM promptly (fail-open, never hangs)", async () => {
  const prewarm = prewarmMod.createPrewarmer(async () => {
    throw new Error("worker unreachable");
  });
  const t0 = Date.now();
  await prewarm(); // mount
  const result = await prewarm(); // BOOM
  eq(result, false, "failed wake reports false: ");
  ok(Date.now() - t0 < 1000, "BOOM must not hang on a failed wake");
});

/* -------------------------------------------------------- SAFETY --------- */
console.log("\n=== SAFETY (route, silence, no compile) ===");

await checkAsync("wake targets /health and NEVER /timeline/compile", async () => {
  let body = null;
  const prewarm = prewarmMod.createPrewarmer(async (b) => {
    body = b;
    return {};
  });
  await prewarm();
  ok(body, "no body sent");
  eq(body.path, "/health", "path: ");
  ok(!JSON.stringify(body).includes("timeline/compile"), "must not touch /timeline/compile");
  eq(prewarmMod.PREWARM_PATH, "/health", "PREWARM_PATH: ");
});

await checkAsync("no compile payload is ever sent by the wake", async () => {
  let body = null;
  const prewarm = prewarmMod.createPrewarmer(async (b) => {
    body = b;
    return {};
  });
  await prewarm();
  eq(Object.keys(body).length, 1, "wake body must carry ONLY the path key: ");
  for (const k of ["items", "duration", "fps", "resolution"]) {
    ok(!(k in body), `wake body must not contain ${k}`);
  }
});

await checkAsync("network/transport failure resolves false and NEVER rejects", async () => {
  const prewarm = prewarmMod.createPrewarmer(async () => {
    throw new Error("network down");
  });
  let threw = false;
  let result = null;
  try {
    result = await prewarm();
  } catch {
    threw = true;
  }
  eq(threw, false, "prewarm must not reject: ");
  eq(result, false, "result: ");
});

await checkAsync("non-2xx response is survivable (reported as not-ok, no throw)", async () => {
  const prewarm = prewarmMod.createPrewarmer(async () => ({ error: { status: 405 } }));
  eq(await prewarm(), true, "transport resolved => wake is done: ");
});

await checkAsync("failure is memoised (no retry storm on repeated calls)", async () => {
  let calls = 0;
  const prewarm = prewarmMod.createPrewarmer(async () => {
    calls++;
    throw new Error("cold");
  });
  await prewarm();
  await prewarm();
  await prewarm();
  eq(calls, 1, "invoke count: ");
});

/* ------------------------------------------------ STATIC WIRING ---------- */
console.log("\n=== STATIC WIRING (no browser available; source-level) ===");

check("client wires the prewarm through createPrewarmer", () => {
  ok(/export const prewarmAiWorker = createPrewarmer\(/.test(clientSrc),
     "prewarmAiWorker must be built by createPrewarmer");
  ok(/import \{ createPrewarmer \} from "@\/lib\/workerPrewarm"/.test(clientSrc),
     "createPrewarmer must be imported");
});

check("wake goes through the authenticated proxy on the /health route", () => {
  ok(/supabase\.functions\.invoke\('ai-worker-proxy'/.test(clientSrc),
     "wake must go through the ai-worker-proxy (which injects the worker token)");
  ok(/PREWARM_PATH/.test(loadPrewarmSource()) || /"\/health"/.test(loadPrewarmSource()),
     "wake path must be /health");
  // Strip comments: the module's doc comment explains which route is NOT used.
  ok(!/timeline\/compile/.test(stripComments(loadPrewarmSource())),
     "prewarm module must not reference /timeline/compile in code");
});

check("no worker credential is read client-side", () => {
  const pre = loadPrewarmSource();
  for (const bad of ["AI_WORKER_API_KEY", "Worker_API_key", "WORKER_API_KEY"]) {
    ok(!pre.includes(bad), `prewarm must not reference ${bad}`);
    ok(!/prewarmAiWorker[\s\S]{0,400}WORKER_API_KEY/.test(clientSrc),
       "wake must not carry a worker credential");
  }
});

check("Editor mount pre-warm is unchanged and still fire-and-forget", () => {
  const m = editorSrc.match(/useEffect\(\(\) => \{\s*void prewarmAiWorker\(\);\s*\}, \[\]\);/);
  ok(m, "expected `useEffect(() => { void prewarmAiWorker(); }, []);`");
  ok(!/await prewarmAiWorker\(\)/.test(m[0]), "the mount effect must not await");
});

// --- race closure: BOOM waits for the wake before compiling ------------------
function boomHandler() {
  const start = editorSrc.indexOf("const handleBoomClick");
  ok(start > -1, "handleBoomClick not found");
  const next = editorSrc.indexOf("\n  const ", start + 10);
  return editorSrc.slice(start, next > -1 ? next : undefined);
}

check("BOOM awaits the pre-warm before the compile request", () => {
  const h = boomHandler();
  const awaitIdx = h.indexOf("await prewarmAiWorker()");
  const compileIdx = h.indexOf("compileTimeline(");
  ok(awaitIdx > -1, "handleBoomClick must await prewarmAiWorker()");
  ok(compileIdx > -1, "compileTimeline call not found");
  ok(awaitIdx < compileIdx, "the await must come BEFORE the compile request");
});

check("BOOM awaits inside the compile guard (no wait when nothing to compile)", () => {
  const h = boomHandler();
  const guard = h.indexOf("if (timelineItems.length > 0)");
  const awaitIdx = h.indexOf("await prewarmAiWorker()");
  const compileIdx = h.indexOf("compileTimeline(");
  ok(guard > -1, "compile guard not found");
  ok(guard < awaitIdx && awaitIdx < compileIdx, "await must sit inside the compile guard");
});

check("single-flight singleton is reused (no second prewarmer anywhere)", () => {
  ok((editorSrc.match(/createPrewarmer\(/g) || []).length === 0,
     "Editor must not construct its own prewarmer");
  ok((clientSrc.match(/createPrewarmer\(/g) || []).length === 1,
     "exactly one prewarmer must exist (the module singleton)");
  ok((editorSrc.match(/prewarmAiWorker\(/g) || []).length === 2,
     "exactly two call sites: mount + BOOM await");
  ok(/import \{ aiWorkerClient, prewarmAiWorker \}/.test(editorSrc),
     "BOOM must import the same singleton the mount effect uses");
});

check("the wait reuses the existing Processing state and adds no UI", () => {
  const h = boomHandler();
  const processingIdx = h.indexOf("setIsProcessing(true)");
  const awaitIdx = h.indexOf("await prewarmAiWorker()");
  ok(processingIdx > -1, "setIsProcessing(true) not found");
  ok(processingIdx < awaitIdx, "Processing state must already be set before the wait");
  const around = h.slice(Math.max(0, awaitIdx - 500), awaitIdx + 200);
  ok(!/toast\(/.test(around), "the pre-warm wait must not toast");
  ok(!/set[A-Z]/.test(h.slice(awaitIdx - 700, awaitIdx)), "no new state around the wait");
});

check("failed pre-warm is fail-open: the result is not used as a gate", () => {
  const h = boomHandler();
  const m = h.match(/\n\s*(await prewarmAiWorker\(\);)/);
  ok(m, "expected a bare `await prewarmAiWorker();` statement");
  ok(!/(if|while|return)\s*\(?\s*await prewarmAiWorker\(\)/.test(h),
     "the await result must not gate the BOOM flow");
  ok(!/=\s*await prewarmAiWorker\(\)/.test(h), "the result must not be consumed");
});

check("no retry loop was introduced around the wake or the compile", () => {
  const h = boomHandler();
  ok(!/while\s*\(/.test(h), "no while-loop in handleBoomClick");
  ok(!/retry|backoff/i.test(h), "no retry/backoff logic in handleBoomClick");
  ok((h.match(/compileTimeline\(/g) || []).length === 1, "exactly one compile request");
  ok((h.match(/await prewarmAiWorker\(\)/g) || []).length === 1, "exactly one wake await");
});

check("duplicate-job protection is unaffected (BOOM still guarded while processing)", () => {
  ok(/disabled=\{isProcessing \|\| !projectData\}/.test(editorSrc),
     "the BOOM button must stay disabled while processing");
  ok(/if \(isProcessing\)/.test(editorSrc) || /disabled=\{isProcessing/.test(editorSrc),
     "re-entry guard must remain");
});

check("pre-warm surfaces no UI anywhere (no toast, no state, no console.error)", () => {
  const pre = loadPrewarmSource();
  ok(!/toast|console\.error/.test(stripComments(pre)), "prewarm module must not surface errors");
  ok(!/toast/.test(stripComments(clientSrc).replace(/[\s\S]*$/, "")) ||
     !/prewarmAiWorker[\s\S]{0,300}toast/.test(clientSrc),
     "the wake must not toast");
});

check("BOOM compile payload behaviour is unchanged", () => {
  ok(/aiWorkerClient\.compileTimeline\(\{/.test(editorSrc), "compile call must remain");
  for (const k of ["items: timelineItems", "duration: sourceDuration()", "fps: 30",
                   "resolution: { width: 1080, height: 1920 }"]) {
    ok(editorSrc.includes(k), `BUILD/BOOM payload must still send ${k}`);
  }
  ok(/return this\.callWorker\('\/timeline\/compile', body\);/.test(clientSrc),
     "compile must still go through callWorker('/timeline/compile')");
});

check("no infrastructure change (no minScale, no standing cost)", () => {
  const repo = readFileSync(join(ROOT, "ai-worker/cloudrun-service.yaml"), "utf8");
  ok(!/minScale:\s*['"]?[1-9]/.test(repo), "must not pin a warm instance");
  ok(!/min-instances/.test(editorSrc + clientSrc), "no instance pinning in the client");
});

function loadPrewarmSource() {
  return readFileSync(join(ROOT, "src/lib/workerPrewarm.ts"), "utf8");
}
/** Remove block and line comments so assertions test CODE, not prose. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
function prewarmModSource() {
  return loadPrewarmSource();
}

/* ---------------------------------------------------------- REPORT ------- */
console.log(`\n${"-".repeat(62)}`);
if (failures.length) {
  console.log(`FAILED: ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`OK — ${pass} checks passed`);
