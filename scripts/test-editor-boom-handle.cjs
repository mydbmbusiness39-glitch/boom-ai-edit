const fs = require('fs');
const path = require('path');

const editorSource = fs.readFileSync('src/pages/Editor.tsx', 'utf8');
const tests = [];

// Regression: timeline compile failures surface to UI and reset isProcessing.
if (/catch \(compileErr: any\)/.test(editorSource)) {
  tests.push('PASS: compileErr catch block present');
} else {
  tests.push('FAIL: compileErr catch block missing');
}

if (/Timeline compile failed/.test(editorSource)) {
  tests.push('PASS: timeline compile failure toast present');
} else {
  tests.push('FAIL: timeline compile failure toast missing');
}

if (/throw compileErr/.test(editorSource)) {
  tests.push('PASS: compile error rethrown after toast');
} else {
  tests.push('FAIL: compile error not rethrown');
}

if (/setIsProcessing\(false\)/.test(editorSource)) {
  tests.push('PASS: isProcessing reset present');
} else {
  tests.push('FAIL: isProcessing reset missing');
}

if (/console\.log\('\[DIAGNOSTIC\] BEFORE create-job invoke'\)/.test(editorSource)) {
  tests.push('PASS: create-job pre-invoke diagnostic present');
} else {
  tests.push('FAIL: create-job pre-invoke diagnostic missing');
}

if (/Error creating job:/.test(editorSource)) {
  tests.push('PASS: top-level create-job catch diagnostic present');
} else {
  tests.push('FAIL: top-level create-job catch diagnostic missing');
}

console.log(tests.join('\n'));
const passed = tests.filter((t) => t.startsWith('PASS')).length;
const failed = tests.filter((t) => t.startsWith('FAIL')).length;
console.log(`\nEDITOR_BOOM_HANDLE_TESTS=${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
