#!/usr/bin/env node
/**
 * Boom Editor — mobile preview + empty-music-state regression tests.
 *
 * Runs the REAL TypeScript modules (transpiled with the repo's own esbuild) rather
 * than grepping source, per the "execute pure logic, don't grep source" rule.
 *
 * Static source assertions are clearly marked: they cover layout rules that only a
 * browser can truly render (no browser is available in this environment).
 *
 * Usage: node scripts/mobile-preview-tests.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "boom-preview-"));

/** Transpile a repo TS module to ESM in a temp dir and import it. */
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
function eq(actual, expected, label = "") {
  if (actual !== expected) {
    throw new Error(`${label}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function ok(cond, msg) {
  if (!cond) throw new Error(msg || "expected truthy");
}

const music = await loadTs("src/lib/music.ts");
const fit = await loadTs("src/lib/previewFit.ts");

/* ------------------------------------------------------------------ MUSIC -- */
console.log("\n=== EMPTY MUSIC STATE (never render literal null) ===");

const NULLISH = [null, undefined, "", "   ", "null", "NULL", "Null", "undefined",
                 "none", "N/A", "nan", "false"];

for (const v of NULLISH) {
  check(`normalizeMusic(${JSON.stringify(v)}) -> null`, () => {
    eq(music.normalizeMusic(v), null);
  });
  check(`hasMusic(${JSON.stringify(v)}) -> false`, () => {
    eq(music.hasMusic(v), false);
  });
  check(`musicLabel(${JSON.stringify(v)}) -> "No music"`, () => {
    eq(music.musicLabel(v), "No music");
  });
  check(`musicTrackName(${JSON.stringify(v)}) -> null (track not created)`, () => {
    eq(music.musicTrackName(v), null);
  });
  check(`musicLabel(${JSON.stringify(v)}) never contains "null"`, () => {
    const label = music.musicLabel(v);
    ok(!/null|undefined|nan/i.test(label), `leaked: ${label}`);
  });
}

check('normalizeMusic("  Chill Beat  ") trims', () => {
  eq(music.normalizeMusic("  Chill Beat  "), "Chill Beat");
});
check('musicLabel("Lo-Fi Loop") passes through', () => {
  eq(music.musicLabel("Lo-Fi Loop"), "Lo-Fi Loop");
});
check('musicTrackName("Lo-Fi Loop") -> "Music: Lo-Fi Loop"', () => {
  eq(music.musicTrackName("Lo-Fi Loop"), "Music: Lo-Fi Loop");
});
check('hasMusic("none ") is false (case/space insensitive)', () => {
  eq(music.hasMusic("none "), false);
});
check('musicLabel(0) does not crash and is not "null"', () => {
  ok(!/null/i.test(music.musicLabel(0)));
});

/* -------------------------------------------------------------- ASPECT ---- */
console.log("\n=== PREVIEW ASPECT (9:16 + landscape sources) ===");

check("9:16 source -> '1080 / 1920'", () => {
  eq(fit.previewAspectCss(1080, 1920), "1080 / 1920");
});
check("landscape source -> '1920 / 1080'", () => {
  eq(fit.previewAspectCss(1920, 1080), "1920 / 1080");
});
check("square source -> '1080 / 1080'", () => {
  eq(fit.previewAspectCss(1080, 1080), "1080 / 1080");
});
check("4K vertical -> '2160 / 3840'", () => {
  eq(fit.previewAspectCss(2160, 3840), "2160 / 3840");
});
for (const [w, h] of [[undefined, undefined], [null, null], [0, 0], [0, 1920],
                      [-1080, 1920], [NaN, 1920], [1080, NaN]]) {
  check(`unknown source (${w},${h}) falls back to 9 / 16`, () => {
    eq(fit.previewAspectCss(w, h), "9 / 16");
  });
}
check("default constant is the 9:16 string", () => {
  eq(fit.DEFAULT_PREVIEW_ASPECT_CSS, "9 / 16");
});

/* ----------------------------------------------------------- FIT MATH ----- */
console.log("\n=== FIT INVARIANTS (centred, no crop, no overflow) ===");

// iPhone-ish stage: 390px viewport minus the 3rem (48px) stage padding.
const PHONE_W = 390 - 48;
const PHONE_H = 520;

function assertFit(availW, availH, aspect, label) {
  const r = fit.fitWithin(availW, availH, aspect);
  ok(r.width <= availW, `${label}: width ${r.width} exceeds ${availW}`);
  ok(r.height <= availH, `${label}: height ${r.height} exceeds ${availH}`);
  const ratio = r.width / r.height;
  ok(Math.abs(ratio - aspect) < 0.02,
     `${label}: aspect drifted ${ratio.toFixed(3)} vs ${aspect.toFixed(3)}`);
  // hugging means one dimension is at the bound (no wasted black area)
  ok(r.width === availW || r.height === availH, `${label}: not hugging a bound`);
  return r;
}

check("phone + 9:16 vertical -> height-bound, fits both ways", () => {
  const r = assertFit(PHONE_W, PHONE_H, 9 / 16, "phone 9:16");
  eq(r.height, PHONE_H);
  eq(r.width, Math.floor(PHONE_H * (9 / 16)));
});
check("phone + landscape source -> width-bound", () => {
  const r = assertFit(PHONE_W, PHONE_H, 16 / 9, "phone landscape");
  eq(r.width, PHONE_W);
  ok(r.height < PHONE_H, "landscape should be shorter than the stage");
});
check("phone + square", () => {
  assertFit(PHONE_W, PHONE_H, 1, "phone square");
});
check("tall narrow phone + 9:16", () => {
  assertFit(320, 620, 9 / 16, "narrow 9:16");
});
check("desktop frame geometry is a pure 16:9 fit (unchanged)", () => {
  const r = fit.fitWithin(896, 504, 16 / 9); // max-w-4xl x aspect-video
  eq(r.width, 896);
  eq(r.height, 504);
});
check("degenerate inputs -> 0x0 (never NaN)", () => {
  for (const args of [[0, 100, 0.5], [100, 0, 0.5], [100, 100, 0], [-5, 10, 0.5],
                      [NaN, 10, 0.5], [10, 10, NaN]]) {
    const r = fit.fitWithin(...args);
    eq(r.width, 0);
    eq(r.height, 0);
  }
});

/* -------------------------------------------------- STATIC SOURCE RULES --- */
console.log("\n=== STATIC LAYOUT RULES (no browser available; source-level) ===");

const css = readFileSync(join(ROOT, "src/index.css"), "utf8");
const editor = readFileSync(join(ROOT, "src/pages/Editor.tsx"), "utf8");

check("mobile preview rule is mobile-only", () => {
  ok(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\.editor-preview-frame/.test(css),
     "rule must live inside a max-width:767px media query");
});
check("frame hugs the source aspect var (default 9/16)", () => {
  ok(/\.editor-preview-frame\s*\{[^}]*aspect-ratio:\s*var\(--preview-aspect,\s*9\s*\/\s*16\)/.test(css));
});
check("frame is viewport-bounded (cannot sit off-screen)", () => {
  ok(/\.editor-preview-frame\s*\{[^}]*max-width:\s*min\(100%,\s*calc\(100vw\s*-\s*3rem\)\)/.test(css));
});
check("frame is centred with auto margins", () => {
  const block = css.match(/\.editor-preview-frame\s*\{([^}]*)\}/)[1];
  ok(/margin-left:\s*auto/.test(block) && /margin-right:\s*auto/.test(block));
});
check("frame height cap uses DEFINITE units (canary regression guard)", () => {
  // Strip CSS comments first: the explanatory comment names the bad pattern.
  const block = css.match(/\.editor-preview-frame\s*\{([^}]*)\}/)[1]
    .replace(/\/\*[\s\S]*?\*\//g, "");
  // The collapse bug: `max-height: 100%` against a `flex: 1 1 0%` parent -> 0 on iOS Safari.
  ok(!/max-height:\s*100%/.test(block),
     "max-height:100% collapses inside a flex-basis:0 parent on iOS Safari");
  ok(/max-height:\s*calc\(100vh\s*-\s*18rem\)/.test(block), "missing vh fallback cap");
  ok(/max-height:\s*calc\(100dvh\s*-\s*18rem\)/.test(block), "missing dvh (iOS 15.4+) cap");
  for (const m of block.matchAll(/max-height:\s*([^;]+)/g)) {
    ok(!/%/.test(m[1]), `max-height must not use a percentage: ${m[1].trim()}`);
  }
});
check("mobile preview cannot be squeezed to a sliver", () => {
  // stage + column size to the video on mobile (base flex-1 still applies at md+)
  ok(/flex-1 bg-black\/50 p-6 flex items-center justify-center max-md:flex-none max-md:min-w-0/
       .test(editor), "preview stage must be max-md:flex-none");
  ok(/flex-1 flex flex-col max-md:flex-none max-md:min-w-0/.test(editor),
     "main column must be max-md:flex-none");
});
check("row scrolls vertically on mobile so nothing is clipped", () => {
  ok(/overflow-hidden max-md:min-h-0 max-md:overflow-y-auto/.test(editor),
     "row needs max-md:overflow-y-auto with base overflow-hidden");
  ok(!/max-md:overflow-x/.test(editor), "must not touch horizontal scrolling");
});
check("editor frame carries the class + aspect var + data-cy", () => {
  ok(/className="editor-preview-frame[^"]*"/.test(editor), "missing frame class");
  ok(/"--preview-aspect": previewAspect/.test(editor), "missing aspect var binding");
  ok(/data-cy="editor-preview-frame"/.test(editor));
});
check("aspect var is bound without an `any` escape hatch", () => {
  // Scope to the binding itself: the file has pre-existing `any` usages elsewhere,
  // so only THIS line must be type-safe.
  const binding = editor.match(/style=\{\{[^\n]*previewAspect[^\n]*\}/);
  ok(binding, "aspect var binding not found");
  ok(!/as any/.test(binding[0]), `binding must not use \`as any\`: ${binding[0]}`);
  ok(/as CSSProperties/.test(binding[0]), "binding must be typed as CSSProperties");
  ok(/type CSSProperties/.test(editor) || /CSSProperties\b/.test(editor.slice(0, 800)),
     "CSSProperties must be imported");
});
check("video keeps object-contain (never cropped or stretched)", () => {
  ok(/className="absolute inset-0 w-full h-full object-contain"/.test(editor));
});
check("preview video element + handlers intact (playback/audio untouched)", () => {
  for (const attr of ["data-cy=\"editor-preview-video\"", "onLoadedMetadata={handlePreviewLoadedMetadata}",
                      "onPlay={handlePreviewPlay}", "onPause={handlePreviewPause}",
                      "onTimeUpdate={handlePreviewTimeUpdate}", "playsInline"]) {
    ok(editor.includes(attr), `missing ${attr}`);
  }
});
check("aspect is set from loadedmetadata", () => {
  ok(/previewAspectCss\(video\.videoWidth,\s*video\.videoHeight\)/.test(editor));
});
check("side panel stacks on mobile (preview keeps full viewport width)", () => {
  ok(/className="w-full md:w-80[^"]*"/.test(editor), "side panel must be responsive");
  ok(/flex flex-col md:flex-row flex-1 overflow-hidden/.test(editor),
     "row must stack on mobile and stay side-by-side from md up");
});
check("music track is created only for a real selection", () => {
  ok(/if \(hasMusic\(projectData\.music\)\)/.test(editor));
  ok(!/if \(projectData\.music\) \{/.test(editor), "old truthy check must be gone");
});
check("raw projectData.music is never rendered", () => {
  ok(!/\{projectData\.music\}/.test(editor), "literal interpolation still present");
  ok(/\{musicLabel\(projectData\.music\)\}/.test(editor));
});
check("stored music value is normalised on load", () => {
  ok(/normalizeMusic\(localStorage\.getItem\('selectedMusic'\)\)/.test(editor));
});

// Desktop invariance: every utility added for the mobile fix must be scoped to the
// mobile breakpoint (max-md:) or explicitly restored at md:. Nothing may apply to md+.
check("desktop row/side-panel utilities are mobile-scoped", () => {
  const row = editor.match(/className="(flex flex-col md:flex-row flex-1 overflow-hidden[^"]*)"/);
  ok(row, "row className not found");
  // base flex-col + every added sizing utility must be mobile-only
  ok(row[1].includes("md:flex-row"), "row must return to flex-row at md");
  for (const u of row[1].split(/\s+/)) {
    if (/^(min-|max-h|shrink|grow)/.test(u)) {
      ok(u.startsWith("max-md:"), `row utility ${u} is not mobile-scoped`);
    }
  }
  const panel = editor.match(/className="(w-full md:w-80[^"]*)"/);
  ok(panel, "side panel className not found");
  ok(panel[1].includes("md:w-80"), "panel must be w-80 at md");
  ok(panel[1].includes("md:border-l") && panel[1].includes("md:border-t-0"),
     "panel must restore desktop borders at md");
  for (const u of panel[1].split(/\s+/)) {
    if (/^(min-|max-h|shrink)/.test(u)) {
      ok(u.startsWith("max-md:"), `panel utility ${u} would change desktop`);
    }
  }
});
check("desktop frame geometry untouched (no inline size / no md aspect override)", () => {
  const frame = editor.match(/className="(editor-preview-frame[^"]*)"/)[1];
  ok(frame.includes("max-w-4xl") && frame.includes("aspect-video"),
     "desktop frame must keep max-w-4xl + aspect-video");
  ok(!/md:aspect-/.test(frame), "frame must not override aspect at md");
  ok(!/style=\{\{\s*width/.test(editor), "no inline width on the frame");
});

/* ----------------------------------------------------------------- REPORT -- */
console.log(`\n${"-".repeat(62)}`);
if (failures.length) {
  console.log(`FAILED: ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`OK — ${pass} checks passed`);
