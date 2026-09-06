const fs = require('fs');
const path = require('path');

const statusPath = path.join(__dirname, '..', 'src', 'pages', 'Status.tsx');
const bundlePath = path.join(__dirname, '..', 'dist', 'assets', 'index-CDjdhBUw.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed = true;
  } else {
    console.log('PASS:', msg);
  }
}

const src = fs.readFileSync(statusPath, 'utf8');
const bundle = fs.readFileSync(bundlePath, 'utf8');

// 1. Status.tsx contains UUID_REGEX
assert(src.includes('UUID_REGEX'), 'Status.tsx contains UUID_REGEX');

// 2. Status.tsx validates jobId before jobs_new query
assert(
  src.indexOf('UUID_REGEX.test(jobId)') < src.indexOf('.from("jobs_new")'),
  'Status.tsx UUID check occurs before jobs_new query'
);

// 3. Status.tsx clears localStorage for invalid IDs
assert(
  src.includes('localStorage.removeItem("currentJobId")'),
  'Status.tsx removes stale currentJobId on invalid ID'
);

// 4. Status.tsx sets error state for malformed IDs
assert(
  src.includes('Invalid job ID:') || src.includes('Expected a UUID'),
  'Status.tsx sets malformed-ID error message'
);

// 5. Bundle contains UUID guard before status fetch/mapping
const guardedBundle = bundle.includes('UUID_REGEX') || bundle.includes('Invalid job ID');
assert(guardedBundle, 'Production bundle contains UUID guard');

// 6. Bundle still contains jobs_new query path for valid flow
assert(bundle.includes('jobs_new'), 'Bundle still queries jobs_new for valid UUID flow');

// 7. Bundle still contains Render Complete path
assert(bundle.includes('Render Complete!'), 'Bundle still contains Render Complete path');

// 8. Simulate malformed ID rendering: verify no jobs_new query in malformed branch
const malformedBranch = bundle.includes('Invalid job ID:');
const directQueryOnly = bundle.includes('from("jobs_new")');
assert(malformedBranch && directQueryOnly, 'Malformed-ID guard and DB query both present in bundle');

if (failed) {
  console.error('\nStatus UUID guard tests FAILED');
  process.exit(1);
} else {
  console.log('\nStatus UUID guard tests PASSED');
  process.exit(0);
}
