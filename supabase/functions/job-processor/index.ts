import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobProcessingRequest {
  jobId: string;
  stage: 'beats' | 'scenes' | 'captions' | 'timeline' | 'render';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const aiWorkerUrl = Deno.env.get('AI_WORKER_URL')!;
    const redisUrl = Deno.env.get('REDIS_URL')!;

    // Create Supabase client with service role key for full access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { jobId, stage }: JobProcessingRequest = await req.json();

    console.log(`Processing job ${jobId} at stage: ${stage}`);

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs_new')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || 'Unknown error'}`);
    }

    // Update job status to processing
    await supabase
      .from('jobs_new')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    let nextStage = '';
    let progress = 0;

    switch (stage) {
      case 'beats':
        // Analyze audio for beats
        console.log('Analyzing beats...');
        progress = 20;
        nextStage = 'scenes';
        
        // Call AI worker for beat analysis
        const audioFiles = job.files?.filter((f: any) => f.type === 'audio') || [];
        if (audioFiles.length > 0) {
          try {
            const response = await fetch(`${aiWorkerUrl}/analyze/beats`, {
              method: 'POST',
              body: new FormData() // Would contain actual audio file
            });
            
            if (response.ok) {
              const beatData = await response.json();
              console.log('Beat analysis complete:', beatData);
            }
          } catch (error) {
            console.error('Beat analysis error:', error);
          }
        }
        break;

      case 'scenes':
        // Analyze video for scene detection
        console.log('Analyzing scenes...');
        progress = 40;
        nextStage = 'captions';
        
        const videoFiles = job.files?.filter((f: any) => f.type === 'video') || [];
        if (videoFiles.length > 0) {
          try {
            const response = await fetch(`${aiWorkerUrl}/analyze/scenes`, {
              method: 'POST',
              body: new FormData() // Would contain actual video file
            });
            
            if (response.ok) {
              const sceneData = await response.json();
              console.log('Scene analysis complete:', sceneData);
            }
          } catch (error) {
            console.error('Scene analysis error:', error);
          }
        }
        break;

      case 'captions':
        // Generate AI captions
        console.log('Generating captions...');
        progress = 60;
        nextStage = 'timeline';
        
        try {
          const captionRequest = {
            style: job.style_id === 'rgb-gamer' ? 'rgb' : 'lux',
            duration: job.duration || 15,
            context: job.name || ''
          };
          
          const response = await fetch(`${aiWorkerUrl}/generate/captions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(captionRequest)
          });
          
          if (response.ok) {
            const captionData = await response.json();
            console.log('Caption generation complete:', captionData.captions);
            
            // Store captions in job
            await supabase
              .from('jobs_new')
              .update({ 
                files: {
                  ...job.files,
                  captions: captionData.captions
                }
              })
              .eq('id', jobId);
          }
        } catch (error) {
          console.error('Caption generation error:', error);
        }
        break;

      case 'timeline':
        // Compile timeline
        console.log('Compiling timeline...');
        progress = 80;
        nextStage = 'render';
        
        try {
          const timelineRequest = {
            items: [], // Would contain actual timeline items
            duration: job.duration || 15,
            fps: 30,
            resolution: { width: 1080, height: 1920 } // 9:16 aspect ratio
          };
          
          const response = await fetch(`${aiWorkerUrl}/timeline/compile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(timelineRequest)
          });
          
          if (response.ok) {
            const timelineData = await response.json();
            console.log('Timeline compilation complete');
            
            // Generate preview URL (simulation)
            const previewUrl = `${Deno.env.get('PUBLIC_BASE_URL')}/previews/${jobId}_preview.mp4`;
            
            await supabase
              .from('jobs_new')
              .update({ 
                preview_url: previewUrl,
                progress: 90
              })
              .eq('id', jobId);
          }
        } catch (error) {
          console.error('Timeline compilation error:', error);
        }
        break;

      case 'render':
        // Final render
        console.log('Final rendering...');
        progress = 100;
        
        // Simulate final render (in real app, this would call FFmpeg)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const outputUrl = `${Deno.env.get('PUBLIC_BASE_URL')}/outputs/${jobId}_final.mp4`;
        
        await supabase
          .from('jobs_new')
          .update({ 
            status: 'completed',
            output_url: outputUrl,
            progress: 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        console.log(`Job ${jobId} completed successfully`);
        break;
    }

    // Update progress and queue next stage if not complete
    if (nextStage) {
      await supabase
        .from('jobs_new')
        .update({ progress })
        .eq('id', jobId);

      // Queue next stage (in real app, this would use Redis)
      console.log(`Queueing next stage: ${nextStage} for job ${jobId}`);
      
      // Simulate queuing delay
      setTimeout(async () => {
        await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, stage: nextStage })
        });
      }, 3000);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      jobId,
      stage,
      progress,
      nextStage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Job processing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});