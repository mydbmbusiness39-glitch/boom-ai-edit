import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    console.log('[DIAGNOSTIC] create-job request received', {
      hasAuthHeader: !!authHeader,
      method: req.method,
      contentType: req.headers.get('content-type'),
    });
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    // Create client with user token for RLS
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY'), {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Get user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    console.log('[DIAGNOSTIC] create-job auth result', {
      userId: user?.id || null,
      userError: userError?.message || null,
    });
    if (userError || !user) {
      throw new Error('User not authenticated');
    }
    const jobRequest = await req.json();
    console.log('[DIAGNOSTIC] create-job payload parsed', {
      userId: user.id,
      name: jobRequest.name,
      filesCount: Array.isArray(jobRequest.files?.media) ? jobRequest.files.media.length : 0,
      style_id: jobRequest.style_id,
      duration: jobRequest.duration,
      caption_style: jobRequest.caption_style,
      hasTimeline: !!jobRequest.files?.timeline,
    });
    console.log('Creating job for user:', user.id);
    // Profile must exist (fail-closed). Quota/watermark from account_entitlements only.
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    if (profileError || !profile) {
      throw new Error(`Profile not found: ${profileError?.message || 'no row'}`);
    }
    const { data: entitlementRows, error: entitlementError } = await supabase
      .rpc('account_entitlements', { user_uuid: user.id });
    if (entitlementError || !entitlementRows || entitlementRows.length === 0) {
      throw new Error(`Entitlements not found: ${entitlementError?.message || 'no row'}`);
    }
    const entitlements = entitlementRows[0];
    const dailyLimit = entitlements.daily_job_limit;
    if (dailyLimit !== null && dailyLimit !== undefined) {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayJobs, error: jobCountError } = await supabase.from('jobs_new').select('id').eq('user_id', user.id).gte('created_at', `${today}T00:00:00.000Z`).lt('created_at', `${today}T23:59:59.999Z`);
      if (jobCountError) {
        throw new Error(`Error checking job count: ${jobCountError.message}`);
      }
      if ((todayJobs?.length || 0) >= dailyLimit) {
        throw new Error(`Daily job limit reached (${dailyLimit} jobs per day for ${entitlements.plan} tier)`);
      }
    }
    // Create new job
    const insertPayload = {
      name: jobRequest.name,
      user_id: user.id,
      files: jobRequest.files,
      style_id: jobRequest.style_id,
      duration: jobRequest.duration,
      status: 'pending',
      progress: 0,
      watermarked: entitlements.watermark === true
    };
    console.log('[DIAGNOSTIC] create-job insert attempted', insertPayload);
    const { data: newJob, error: createError } = await supabase.from('jobs_new').insert(insertPayload).select().single();
    console.log('[DIAGNOSTIC] create-job insert result', {
      newJobId: newJob?.id || null,
      createError: createError?.message || null,
    });
    if (createError) {
      throw new Error(`Failed to create job: ${createError.message}`);
    }
    console.log('Job created:', newJob.id);
    // Start processing pipeline
    const processorUrl = `${supabaseUrl}/functions/v1/job-processor`;
    // Queue first stage (beats analysis)
    setTimeout(async ()=>{
      try {
        await fetch(processorUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
            'authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            jobId: newJob.id,
            stage: 'beats'
          })
        });
      } catch (error) {
        console.error('Error starting job processing:', error);
      }
    }, 1000);
    return new Response(JSON.stringify({
      success: true,
      job: newJob
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Create job error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
