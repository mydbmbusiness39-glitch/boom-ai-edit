import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_WORKER_URL = Deno.env.get('AI_WORKER_URL') || 'http://localhost:8000';
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/ai-worker-proxy', '');
    
    // Forward request to AI worker service
    const targetUrl = `${AI_WORKER_URL}${path}`;
    console.log(`Proxying request to: ${targetUrl}`);
    
    const forwardedRequest = new Request(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });

    const response = await fetch(forwardedRequest);
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
    
  } catch (error) {
    console.error('AI Worker proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'AI Worker service unavailable',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});