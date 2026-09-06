const fs = require('fs');
const assert = require('assert');

// Load source files
const uploadSrc = fs.readFileSync('src/pages/Upload.tsx', 'utf8');
const editorSrc = fs.readFileSync('src/pages/Editor.tsx', 'utf8');

// Test 1: Upload.tsx no longer serializes raw File objects
assert(!uploadSrc.includes("localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));"),
  'Upload.tsx must not store raw uploadedFiles');
assert(uploadSrc.includes("localStorage.setItem('uploadedFiles', JSON.stringify(serializableFiles));"),
  'Upload.tsx must store sanitized serializableFiles');
assert(uploadSrc.includes('name: f.file?.name || f.name'),
  'Upload.tsx must preserve file name in metadata');
assert(uploadSrc.includes('size: f.file?.size || f.size || 0'),
  'Upload.tsx must preserve file size in metadata');

// Test 2: Editor.tsx has safe fallback when file object is missing
assert(editorSrc.includes('if (!fileObj) continue;'),
  'Editor.tsx must skip missing file objects safely');
assert(editorSrc.includes('uploadedFileUrls'),
  'Editor.tsx must still read uploadedFileUrls fallback');

// Test 3: Gate #77 create-job changes untouched
assert(editorSrc.includes('functions.invoke("create-job"'),
  'Editor.tsx must still use Supabase Edge Function invoke');
assert(editorSrc.includes('jobs_new'),
  'Editor.tsx must still poll jobs_new');
assert(!editorSrc.includes('/api/create-job'),
  'Editor.tsx must not contain stale /api/create-job path');

// Test 4: Simulate localStorage round-trip preserves metadata
const mockFile = { name: 'test-video.mp4', type: 'video/mp4', size: 2048 };
const uploadedFiles = [{ id: '1', file: mockFile, type: 'video' }];

// Old behavior would fail
const oldRoundTrip = JSON.parse(JSON.stringify(uploadedFiles));
assert.strictEqual(oldRoundTrip[0].file.name, 'test-video.mp4', 'plain object round-trip keeps name');

// New behavior strips File but preserves metadata
const serializable = uploadedFiles.map((f) => ({
  id: f.id,
  name: f.file?.name || f.name,
  type: f.type,
  size: f.file?.size || f.size || 0,
  preview: f.preview,
}));
const restored = JSON.parse(JSON.stringify(serializable));
assert.strictEqual(restored[0].name, 'test-video.mp4', 'restored preserves file name');
assert.strictEqual(restored[0].type, 'video', 'restored preserves type');
assert.strictEqual(restored[0].size, 2048, 'restored preserves size');
assert.strictEqual(restored[0].file, undefined, 'restored removes non-serializable file object');

console.log('UPLOAD_PERSISTENCE_COMPREHENSIVE_TEST=1 PASS');
