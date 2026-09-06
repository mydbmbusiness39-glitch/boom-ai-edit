const fs = require('fs');
const assert = require('assert');

const uploadSrc = fs.readFileSync('src/pages/Upload.tsx', 'utf8');
assert(uploadSrc.includes("localStorage.setItem('uploadedFiles', JSON.stringify(serializableFiles))"), 'upload stores sanitized metadata');
assert(uploadSrc.includes('name: f.file?.name || f.name'), 'upload preserves name metadata');
assert(!uploadSrc.includes("localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));"), 'upload no longer stores raw uploadedFiles');

const editorSrc = fs.readFileSync('src/pages/Editor.tsx', 'utf8');
assert(editorSrc.includes('uploadedFileUrls'), 'editor reads uploadedFileUrls fallback');
assert(editorSrc.includes('if (!fileObj) continue;'), 'editor skips missing file objects safely');

console.log('UPLOAD_PERSISTENCE_SOURCE_TEST=1 PASS');
