const assert = require('assert');

// Use a real File-like mock without class methods
function makeFileLike(name, type, size) {
  return { name, type, size };
}

// Simulate Upload page storing uploadedFiles with File-like objects
const uploadedFiles = [
  { id: '1', file: makeFileLike('test.mp4', 'video/mp4', 1024), type: 'video' }
];

// The real problem is not JSON round-trip itself, it's that `file` should not be serialized
// because consumers expect a File/Blob or uploadable handle, and localStorage cannot store that.
const fromStorage = JSON.parse(JSON.stringify(uploadedFiles));
assert.strictEqual(fromStorage[0].file.name, 'test.mp4', 'plain object round-trip keeps name');

// New behavior: persist metadata only, drop raw file from serialized state
const serialized = uploadedFiles.map((f) => ({
  id: f.id,
  name: f.file?.name || f.name,
  type: f.type,
  size: f.file?.size || f.size || 0,
  preview: f.preview,
}));
const restored = JSON.parse(JSON.stringify(serialized));
assert.strictEqual(restored[0].name, 'test.mp4', 'restored preserves file name');
assert.strictEqual(restored[0].type, 'video', 'restored preserves type');
assert.strictEqual(restored[0].size, 1024, 'restored preserves size');
assert.strictEqual(restored[0].file, undefined, 'restored removes file object');

console.log('UPLOAD_PERSISTENCE_TEST=1 PASS');
