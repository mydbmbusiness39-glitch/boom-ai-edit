import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = req.headers.get('x-trace-id') || 'no-trace';

  try {
    console.log('[DIAGNOSTIC] ai-worker-proxy request entry', {
      traceId,
      method: req.method,
      url: req.url
    });

    const AI_WORKER_URL = Deno.env.get('AI_WORKER_URL');
    console.log('[DIAGNOSTIC] ai-worker-proxy env/bootstrap', {
      traceId,
      aiWorkerUrl: AI_WORKER_URL || 'UNSET'
    });

    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/ai-worker-proxy', '');

    // Forward request to AI worker service
    const targetUrl = `${AI_WORKER_URL || 'http://localhost:8000'}${path}`;
    console.log('[DIAGNOSTIC] ai-worker-proxy proxying', {
      traceId,
      targetUrl
    });

    const forwardedRequest = new Request(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    const response = await fetch(forwardedRequest);
    const data = await response.text();

    console.log('[DIAGNOSTIC] ai-worker-proxy worker response', {
      traceId,
      workerStatus: response.status,
      contentType: response.headers.get('Content-Type')
    });

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    console.error('[DIAGNOSTIC] ai-worker-proxy caught exception', {
      traceId,
      name: error?.name || 'unknown',
      message: error?.message || 'unknown',
      stack: error?.stack || 'unknown'
    });
    return new Response(
      JSON.stringify({ 
        error: 'AI Worker service unavailable',
        message: error.message,
        traceId
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});