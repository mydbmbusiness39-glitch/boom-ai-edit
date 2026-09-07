const fs = require('fs');
const path = require('path');

const editorSource = fs.readFileSync('src/pages/Editor.tsx', 'utf8');
const tests = [];

// Regression: reloaded persisted metadata maps to a valid flat timeline item shape.
if (/const sourceIndex = new Map/.test(editorSource)) {
  tests.push('PASS: sourceIndex present for cloud URL mapping');
} else {
  tests.push('FAIL: sourceIndex missing');
}

if (/const ambiguous = new Set/.test(editorSource)) {
  tests.push('PASS: ambiguous set present');
} else {
  tests.push('FAIL: ambiguous set missing');
}

if (/Edit source missing: \${rawSource}/.test(editorSource)) {
  tests.push('PASS: missing-source error references rawSource');
} else {
  tests.push('FAIL: missing-source error not referencing rawSource');
}

if (/Ambiguous source mapping: \${rawSource}/.test(editorSource)) {
  tests.push('PASS: ambiguous-source error references rawSource');
} else {
  tests.push('FAIL: ambiguous-source error not referencing rawSource');
}

if (/start_time: Number\(item\.startTime \|\| 0\)/.test(editorSource)) {
  tests.push('PASS: start_time uses fallback 0');
} else {
  tests.push('FAIL: start_time fallback missing');
}

if (/end_time: Number\(\(item\.startTime \|\| 0\) \+ \(item\.duration \|\| 0\)\)/.test(editorSource)) {
  tests.push('PASS: end_time uses fallback duration');
} else {
  tests.push('FAIL: end_time fallback missing');
}

if (/content = \{ src: src\.url, name: rawSource, type: src\.type \}/.test(editorSource)) {
  tests.push('PASS: content built from mapped source');
} else {
  tests.push('FAIL: content not built from mapped source');
}

if (/effects: \[\]/.test(editorSource)) {
  tests.push('PASS: effects array present on timeline items');
} else {
  tests.push('FAIL: effects array missing');
}

console.log(tests.join('\n'));
const passed = tests.filter((t) => t.startsWith('PASS')).length;
const failed = tests.filter((t) => t.startsWith('FAIL')).length;
console.log(`\nEDITOR_RELOAD_BOOM_TESTS=${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
