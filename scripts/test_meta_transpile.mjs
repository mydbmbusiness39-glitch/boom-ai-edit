#!/usr/bin/env node
/** Syntax/structure validation for the four Meta backend files (esbuild strips types). */
import esbuild from "esbuild";
import { readFileSync } from "node:fs";

const files = [
  "supabase/functions/_shared/meta_guards.ts",
  "supabase/functions/_shared/meta_publish_protocol.ts",
  "supabase/functions/meta-oauth/index.ts",
  "supabase/functions/meta-publish/index.ts",
];

let bad = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  try {
    const { code } = esbuild.transformSync(src, { loader: "ts", format: "esm" });
    console.log(`OK   ${f}  (source ${src.length}b -> js ${code.length}b)`);
  } catch (e) {
    bad++;
    console.log(`FAIL ${f}`);
    console.log("   " + String(e.message).split("\n").slice(0, 6).join("\n   "));
  }
}
console.log(bad === 0 ? "\nTRANSPILE_RESULT=ALL_OK" : `\nTRANSPILE_RESULT=FAIL (${bad})`);
process.exit(bad === 0 ? 0 : 1);
