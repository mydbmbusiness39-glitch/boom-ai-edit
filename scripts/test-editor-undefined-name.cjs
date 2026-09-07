const fs = require('fs');
const path = require('path');

const bundleEntry = fs.readdirSync('dist/assets').find(f => f.startsWith('index-') && f.endsWith('.js'));
const bundlePath = path.join('dist/assets', bundleEntry);
const bundle = fs.readFileSync(bundlePath, 'utf8');
const editorSource = fs.readFileSync('src/pages/Editor.tsx', 'utf8');

const tests = [];

// Test 1: No malformed Authorization header pattern
if (!/Authorization:\s*\*\*\*\s*\$\{/.test(bundle)) {
  tests.push('PASS: malformed Authorization pattern absent');
} else {
  tests.push('FAIL: malformed Authorization pattern present');
}

// Test 2: Correct Bearer concatenation present
if (/Authorization:"Bearer "\+[a-z_]+\.access_token/.test(bundle)) {
  tests.push('PASS: correct Bearer concatenation present');
} else {
  tests.push('FAIL: correct Bearer concatenation absent');
}

// Test 3: Safe fallback in source for missing file.name
if (/file\.file\?\.name\s*\|\|\s*file\.name/.test(editorSource)) {
  tests.push('PASS: safe file name fallback present in source');
} else {
  tests.push('FAIL: safe file name fallback absent in source');
}

// Test 4: No unsafe file.file.name in source
const unsafeCount = (editorSource.match(/file\.file\.name/g) || []).filter(m => !/file\.file\?\.name/.test(m)).length;
if (unsafeCount === 0) {
  tests.push('PASS: no unsafe file.file.name in source');
} else {
  tests.push(`FAIL: ${unsafeCount} unsafe file.file.name in source`);
}

// Test 5: Fallback to uploadedFileUrls when cloudUrls is empty
if (/if \(cloudUrls\.length === 0 && uploadedFileUrls\.length > 0\)/.test(editorSource)) {
  tests.push('PASS: fallback to uploadedFileUrls present');
} else {
  tests.push('FAIL: fallback to uploadedFileUrls missing');
}

// Test 6: Fallback assigns cloudUrls from uploadedFileUrls
if (/cloudUrls = uploadedFileUrls\.map\(/.test(editorSource)) {
  tests.push('PASS: uploadedFileUrls mapped to cloudUrls');
} else {
  tests.push('FAIL: uploadedFileUrls not mapped to cloudUrls');
}

console.log(tests.join('\n'));
const passed = tests.filter(t => t.startsWith('PASS')).length;
const failed = tests.filter(t => t.startsWith('FAIL')).length;
console.log(`\nEDITOR_RENDER_TESTS=${passed}/${passed+failed}`);
if (failed > 0) process.exit(1);
