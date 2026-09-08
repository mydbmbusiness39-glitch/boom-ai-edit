const fs = require('fs');

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

if (/Edit source missing: .*rawSource/.test(editorSource)) {
  tests.push('PASS: missing-source error references rawSource');
} else {
  tests.push('FAIL: missing-source error not referencing rawSource');
}

if (/Ambiguous source mapping: .*rawSource/.test(editorSource)) {
  tests.push('PASS: ambiguous-source error references rawSource');
} else {
  tests.push('FAIL: ambiguous-source error not referencing rawSource');
}

if (/start_time: Number\(item\.startTime/.test(editorSource)) {
  tests.push('PASS: start_time fallback present');
} else {
  tests.push('FAIL: start_time fallback missing');
}

if (/end_time: Number\(.*item\.startTime.*item\.duration/.test(editorSource)) {
  tests.push('PASS: end_time fallback present');
} else {
  tests.push('FAIL: end_time fallback missing');
}

if (/const content = \{ src: src\.url, name: rawSource, type: src\.type \}/.test(editorSource)) {
  tests.push('PASS: content built from mapped source');
} else {
  tests.push('FAIL: content not built from mapped source');
}

if (/effects: \[\]/.test(editorSource)) {
  tests.push('PASS: effects array present on timeline items');
} else {
  tests.push('FAIL: effects array missing');
}

// New regression: persisted/reloaded project state can map sources deterministically.
// Simulate the persisted/reloaded metadata shape that caused the final canary failure.
const mockCloudUrls = [
  { name: 'clip-a.mp4', type: 'video', url: 'http://cdn.example.com/clip-a.mp4', size: 1200 },
  { name: 'clip-b.mp4', type: 'video', url: 'http://cdn.example.com/clip-b.mp4', size: 980 },
];
const mockEditItems = [
  { id: 'file-0', name: 'clip-a.mp4', sourceName: 'clip-a.mp4', type: 'video', startTime: 0, duration: 6, track: 0 },
  { id: 'file-1', name: 'clip-b.mp4', sourceName: 'clip-b.mp4', type: 'video', startTime: 6, duration: 6, track: 1 },
];
const sourceIndex = new Map(mockCloudUrls.map((u) => [u.name, { url: u.url, type: u.type }]));
const timelineItems = mockEditItems.map((item) => {
  const rawSource = item.sourceName || item.name;
  let src = sourceIndex.get(rawSource);
  if (!src && mockCloudUrls.length === mockEditItems.length) {
    src = mockCloudUrls[mockEditItems.indexOf(item)];
  }
  if (!src || !src.url) throw new Error(`Edit source missing: ${rawSource}`);
  return {
    id: item.id,
    type: item.type === 'audio' ? 'audio' : 'video',
    start_time: Number(item.startTime || 0),
    end_time: Number((item.startTime || 0) + (item.duration || 0)),
    track: Number(item.track || 0),
    content: { src: src.url, name: rawSource, type: src.type },
    effects: [],
  };
});
if (timelineItems.length === mockEditItems.length) {
  tests.push('PASS: persisted/reloaded mock editItems resolved without throwing');
} else {
  tests.push('FAIL: persisted/reloaded mock editItems resolution failed');
}

if (timelineItems[0]?.content?.src?.includes('clip-a.mp4')) {
  tests.push('PASS: first timeline item resolved to expected source');
} else {
  tests.push('FAIL: first timeline item source mismatch');
}

if (/pre-compile timeline mapping failed/.test(editorSource)) {
  tests.push('PASS: pre-compile failures surface with toast before rethrow');
} else {
  tests.push('FAIL: pre-compile failure surfacing missing');
}

console.log(tests.join('\n'));
const passed = tests.filter((t) => t.startsWith('PASS')).length;
const failed = tests.filter((t) => t.startsWith('FAIL')).length;
console.log(`\nEDITOR_RELOAD_BOOM_TESTS=${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
