#!/usr/bin/env node
/**
 * Contract tests for Editor.tsx resolveEditorMediaSrc / isObjectUrlSource.
 * Does not import React; extracts the exported helpers from source.
 */
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const src = fs.readFileSync(new URL("../src/pages/Editor.tsx", import.meta.url), "utf8");
const start = src.indexOf("const isHttpUrl");
const end = src.indexOf("\nconst Editor =");
if (start < 0 || end < 0) {
  throw new Error("Could not extract media-src helpers from Editor.tsx");
}
let helpers = src.slice(start, end);
helpers = helpers
  .replace(/export const /g, "const ")
  .replace(/: unknown/g, "")
  .replace(/: value is string/g, "")
  .replace(/: value is Blob/g, "")
  .replace(/: string =>/g, " =>")
  .replace(/input: \{[\s\S]*?\}/g, "input")
  .replace(/ as \{[^}]*\}/g, "")
  .replace(/ as [A-Za-z_][\w.]*/g, "")
  .replace(/\):\s*string\s*=>/g, ") =>");

const createObjectURLCalls = [];
const context = {
  File,
  Blob,
  MediaSource: class MediaSource {},
  URL: {
    createObjectURL(value) {
      createObjectURLCalls.push(value);
      if (
        !(value instanceof Blob) &&
        !(value instanceof File) &&
        !(value instanceof context.MediaSource)
      ) {
        throw new TypeError("Failed to execute 'createObjectURL' on 'URL': Overload resolution failed");
      }
      return "blob:test-" + createObjectURLCalls.length;
    },
  },
  console,
};
vm.createContext(context);
vm.runInContext(helpers + "\nthis.isObjectUrlSource = isObjectUrlSource;\nthis.resolveEditorMediaSrc = resolveEditorMediaSrc;", context);
const { isObjectUrlSource, resolveEditorMediaSrc } = context;

function reset() {
  createObjectURLCalls.length = 0;
}

const results = {};

// FRESH_FILE_TEST
reset();
{
  const file = new File([new Uint8Array([0, 0, 0, 0])], "clip.mp4", { type: "video/mp4" });
  const srcUrl = resolveEditorMediaSrc({ file });
  assert.equal(isObjectUrlSource(file), true);
  assert.equal(srcUrl, "blob:test-1");
  assert.equal(createObjectURLCalls.length, 1);
  results.FRESH_FILE_TEST = "PASS";
}

// RELOADED_PLAIN_OBJECT_TEST
reset();
{
  const reloaded = JSON.parse(JSON.stringify({ name: "clip.mp4", type: "video", size: 1234, file: { name: "clip.mp4" } }));
  assert.equal(isObjectUrlSource(reloaded), false);
  assert.equal(isObjectUrlSource(reloaded.file), false);
  let threw = false;
  try {
    resolveEditorMediaSrc({ file: reloaded });
  } catch (e) {
    threw = true;
    assert.match(String(e.message), /No playable media source/);
  }
  assert.equal(threw, true);
  assert.equal(createObjectURLCalls.length, 0);
  results.RELOADED_PLAIN_OBJECT_TEST = "PASS";
}

// PERSISTED_CLOUD_URL_TEST
reset();
{
  const reloaded = { name: "clip.mp4", type: "video" };
  const url = resolveEditorMediaSrc({
    file: reloaded,
    persistedUrls: [{ name: "clip.mp4", url: "https://cdn.example/clip.mp4" }],
  });
  assert.equal(url, "https://cdn.example/clip.mp4");
  assert.equal(createObjectURLCalls.length, 0);
  results.PERSISTED_CLOUD_URL_TEST = "PASS";
}

// MISSING_SOURCE_TEST
reset();
{
  let threw = false;
  try {
    resolveEditorMediaSrc({ file: null, persistedUrls: [], videoUrl: "" });
  } catch (e) {
    threw = true;
    assert.match(String(e.message), /No playable media source/);
  }
  assert.equal(threw, true);
  assert.equal(createObjectURLCalls.length, 0);
  results.MISSING_SOURCE_TEST = "PASS";
}

// MOV_IPHONE_REGRESSION_TEST
reset();
{
  const mov = new File([new Uint8Array([0, 0, 0, 0])], "IMG_1234.MOV", { type: "video/quicktime" });
  const srcUrl = resolveEditorMediaSrc({ file: mov });
  assert.equal(isObjectUrlSource(mov), true);
  assert.equal(srcUrl, "blob:test-1");
  assert.equal(createObjectURLCalls.length, 1);
  results.MOV_IPHONE_REGRESSION_TEST = "PASS";
}

console.log(JSON.stringify(results, null, 2));
for (const [k, v] of Object.entries(results)) {
  if (v !== "PASS") process.exit(1);
}
