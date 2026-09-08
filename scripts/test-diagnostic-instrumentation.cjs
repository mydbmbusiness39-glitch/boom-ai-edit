const fs = require('fs');

const clientSource = fs.readFileSync('src/utils/aiWorkerClient.ts', 'utf8');
const proxySource = fs.readFileSync('supabase/functions/ai-worker-proxy/index.ts', 'utf8');
const tests = [];

if (/generateTraceId/.test(clientSource)) {
  tests.push('PASS: client trace ID generator present');
} else {
  tests.push('FAIL: client trace ID generator missing');
}

if (/X-Trace-Id/.test(clientSource)) {
  tests.push('PASS: client sends X-Trace-Id header');
} else {
  tests.push('FAIL: client X-Trace-Id header missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy invoke start/.test(clientSource)) {
  tests.push('PASS: client logs invoke start');
} else {
  tests.push('FAIL: client invoke start log missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy invoke error/.test(clientSource)) {
  tests.push('PASS: client logs invoke error shape');
} else {
  tests.push('FAIL: client invoke error log missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy invoke success/.test(clientSource)) {
  tests.push('PASS: client logs invoke success');
} else {
  tests.push('FAIL: client invoke success log missing');
}

if (/name: error\?\.constructor\?\.name/.test(clientSource)) {
  tests.push('PASS: client captures error constructor name');
} else {
  tests.push('FAIL: client error constructor name capture missing');
}

if (/x-trace-id/.test(proxySource)) {
  tests.push('PASS: proxy reads x-trace-id header');
} else {
  tests.push('FAIL: proxy x-trace-id header missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy request entry/.test(proxySource)) {
  tests.push('PASS: proxy logs request entry');
} else {
  tests.push('FAIL: proxy request entry log missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy env\/bootstrap/.test(proxySource)) {
  tests.push('PASS: proxy logs env/bootstrap');
} else {
  tests.push('FAIL: proxy env/bootstrap log missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy proxying/.test(proxySource)) {
  tests.push('PASS: proxy logs target URL');
} else {
  tests.push('FAIL: proxy target URL log missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy worker response/.test(proxySource)) {
  tests.push('PASS: proxy logs worker response status');
} else {
  tests.push('FAIL: proxy worker response log missing');
}

if (/\[DIAGNOSTIC\] ai-worker-proxy caught exception/.test(proxySource)) {
  tests.push('PASS: proxy logs caught exceptions with traceId');
} else {
  tests.push('FAIL: proxy caught exception log missing');
}

if (/message: error\.message/.test(proxySource)) {
  tests.push('PASS: proxy preserves error message in response');
} else {
  tests.push('FAIL: proxy error message response missing');
}

console.log(tests.join('\n'));
const passed = tests.filter((t) => t.startsWith('PASS')).length;
const failed = tests.filter((t) => t.startsWith('FAIL')).length;
console.log(`\nDIAGNOSTIC_INSTRUMENTATION_TESTS=${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
