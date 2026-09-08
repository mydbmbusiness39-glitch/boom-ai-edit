const fs = require('fs');

const proxySource = fs.readFileSync('supabase/functions/ai-worker-proxy/index.ts', 'utf8');
const tests = [];

if (/Access-Control-Allow-Origin': '\*'/.test(proxySource)) {
  tests.push('PASS: wildcard origin allowed');
} else {
  tests.push('FAIL: wildcard origin missing');
}

if (/Access-Control-Allow-Methods': 'POST, GET, OPTIONS'/.test(proxySource)) {
  tests.push('PASS: OPTIONS method allowed');
} else {
  tests.push('FAIL: OPTIONS method missing');
}

if (/Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id'/.test(proxySource)) {
  tests.push('PASS: x-trace-id included in allowed headers');
} else {
  tests.push('FAIL: x-trace-id missing from allowed headers');
}

if (/if \(req\.method === 'OPTIONS'\)/.test(proxySource)) {
  tests.push('PASS: OPTIONS preflight branch present');
} else {
  tests.push('FAIL: OPTIONS preflight branch missing');
}

if (/return new Response\(null, \{ headers: corsHeaders \}\)/.test(proxySource)) {
  tests.push('PASS: OPTIONS returns 200 with CORS headers');
} else {
  tests.push('FAIL: OPTIONS response missing');
}

console.log(tests.join('\n'));
const passed = tests.filter((t) => t.startsWith('PASS')).length;
const failed = tests.filter((t) => t.startsWith('FAIL')).length;
console.log(`\nAI_WORKER_PROXY_CORS_TESTS=${passed}/${passed + failed}`);
if (failed > 0) process.exit(1);
