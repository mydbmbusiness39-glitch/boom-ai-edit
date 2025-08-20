import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const aiWorkerUrl = Deno.env.get('AI_WORKER_URL');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database connectivity
    const { data: dbCheck, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (dbError) {
      throw new Error(`Database check failed: ${dbError.message}`);
    }

    // Check AI worker connectivity if configured
    let aiWorkerStatus = 'not_configured';
    if (aiWorkerUrl) {
      try {
        const aiResponse = await fetch(`${aiWorkerUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        aiWorkerStatus = aiResponse.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        console.error('AI Worker health check failed:', error);
        aiWorkerStatus = 'unhealthy';
      }
    }

    // Check storage bucket accessibility
    const { data: bucketCheck, error: bucketError } = await supabase
      .storage
      .from('video-uploads')
      .list('', { limit: 1 });

    const storageStatus = bucketError ? 'unhealthy' : 'healthy';

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: {
        database: dbError ? 'unhealthy' : 'healthy',
        storage: storageStatus,
        ai_worker: aiWorkerStatus,
      },
      environment: {
        supabase_url: supabaseUrl,
        ai_worker_configured: !!aiWorkerUrl,
      }
    };

    // Overall health is unhealthy if any critical service is down
    const isHealthy = healthStatus.checks.database === 'healthy' && 
                     healthStatus.checks.storage === 'healthy';

    if (!isHealthy) {
      healthStatus.status = 'unhealthy';
    }

    return new Response(JSON.stringify(healthStatus), {
      status: isHealthy ? 200 : 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Health check error:', error);

    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
});