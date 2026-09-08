const fs = require('fs');

const editorSource = fs.readFileSync('src/pages/Editor.tsx', 'utf8');
const tests = [];

if (/Array\.isArray\(projectData\.files\)/.test(editorSource)) {
  tests.push('PASS: Array.isArray guard on projectData.files');
} else {
  tests.push('FAIL: Array.isArray guard missing on projectData.files');
}

if (/Invalid projectData\.files: expected array/.test(editorSource)) {
  tests.push('PASS: invalid files shape error message present');
} else {
  tests.push('FAIL: invalid files shape error message missing');
}

if (/Couldn't load your project files/.test(editorSource)) {
  tests.push('PASS: visible invalid-files toast title present');
} else {
  tests.push('FAIL: visible invalid-files toast title missing');
}

if (/Please re-upload your media files and try again/.test(editorSource)) {
  tests.push('PASS: visible recovery guidance shown on invalid files shape');
} else {
  tests.push('FAIL: recovery guidance missing on invalid files shape');
}

console.log(tests.join('\n'));
const passed = tests.filter((t) => t.startsWith('PASS')).length;
const failed = tests.filter((t) => t.startsWith('FAIL')).length;
console.log(`\nEDITOR_INVALID_FILES_SHAPE_TESTS=${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
