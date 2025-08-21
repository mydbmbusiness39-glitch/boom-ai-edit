import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateJobRequest {
  name: string;
  files: Array<{
    name: string;
    type: 'video' | 'audio' | 'image';
    url: string;
    size: number;
  }>;
  style_id: string;
  duration: number;
  music?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user token for RLS
    const userSupabase = createClient(
      supabaseUrl, 
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Get user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const jobRequest: CreateJobRequest = await req.json();

    console.log('Creating job for user:', user.id);

    // Check job limit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Profile not found: ${profileError.message}`);
    }

    // Check if user can create more jobs (free tier: 5 per day)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayJobs, error: jobCountError } = await supabase
      .from('jobs_new')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (jobCountError) {
      throw new Error(`Error checking job count: ${jobCountError.message}`);
    }

    if (profile.plan === 'free' && todayJobs.length >= 5) {
      throw new Error('Daily job limit reached (5 jobs per day for free tier)');
    }

    // Create new job
    const { data: newJob, error: createError } = await supabase
      .from('jobs_new')
      .insert({
        name: jobRequest.name,
        user_id: user.id,
        files: {
          media: jobRequest.files,
          music: jobRequest.music || 'auto'
        },
        style_id: jobRequest.style_id,
        duration: jobRequest.duration,
        status: 'pending',
        progress: 0,
        watermarked: profile.plan === 'free' // Free tier gets watermark
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create job: ${createError.message}`);
    }

    console.log('Job created:', newJob.id);

    // Start processing pipeline
    const processorUrl = `${supabaseUrl}/functions/v1/job-processor`;
    
    // Queue first stage (beats analysis)
    setTimeout(async () => {
      try {
        await fetch(processorUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create job error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});