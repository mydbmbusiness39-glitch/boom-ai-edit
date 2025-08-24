import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkProcessRequest {
  action: 'style-transfer' | 'one-tap-edit' | 'thumbnail' | 'batch-process';
  creator_ids: string[];
  scheduled_for?: string;
  settings?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No user found');
    }

    const { action, creator_ids, scheduled_for, settings }: BulkProcessRequest = await req.json();

    console.log('Processing bulk action:', {
      action,
      creator_count: creator_ids.length,
      scheduled_for,
      user_id: user.id
    });

    // Validate input
    if (!action || !creator_ids || creator_ids.length === 0) {
      throw new Error('Invalid request: action and creator_ids are required');
    }

    // Process each creator
    const results = [];
    
    for (const creatorId of creator_ids) {
      try {
        let jobData;
        
        switch (action) {
          case 'one-tap-edit':
            jobData = await processOneTapEdit(creatorId, supabaseClient);
            break;
          case 'style-transfer':
            jobData = await processStyleTransfer(creatorId, supabaseClient, settings);
            break;
          case 'thumbnail':
            jobData = await processThumbnailGeneration(creatorId, supabaseClient);
            break;
          case 'batch-process':
            jobData = await processBatchOperation(creatorId, supabaseClient, settings);
            break;
          default:
            throw new Error(`Unsupported action: ${action}`);
        }

        // Create job record
        const jobRecord = {
          user_id: user.id, // The agency admin
          name: `Bulk ${action} for creator ${creatorId}`,
          status: scheduled_for ? 'scheduled' : 'queued',
          team_id: null, // Could be set based on agency team
          style_id: action === 'style-transfer' ? settings?.style_id : null,
          files: jobData.files || [],
          duration: jobData.duration || 60,
          watermarked: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Insert job into database
        const { data: job, error: jobError } = await supabaseClient
          .from('jobs_new')
          .insert(jobRecord)
          .select()
          .single();

        if (jobError) {
          console.error('Error creating job for creator', creatorId, jobError);
          results.push({
            creator_id: creatorId,
            success: false,
            error: jobError.message
          });
          continue;
        }

        // If scheduled, store the schedule
        if (scheduled_for && job) {
          // Here you would typically use a job scheduling service
          console.log(`Job ${job.id} scheduled for ${scheduled_for}`);
          
          // For now, we'll simulate scheduling by updating the job
          const { error: scheduleError } = await supabaseClient
            .from('jobs_new')
            .update({ 
              status: 'scheduled',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (scheduleError) {
            console.error('Error scheduling job:', scheduleError);
          }
        }

        results.push({
          creator_id: creatorId,
          success: true,
          job_id: job?.id,
          scheduled_for
        });

        // Simulate processing delay for realistic UX
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing creator ${creatorId}:`, error);
        results.push({
          creator_id: creatorId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Bulk processing complete: ${successCount} success, ${failureCount} failures`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total_processed: creator_ids.length,
          successful: successCount,
          failed: failureCount,
          action,
          scheduled_for
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in bulk-creator-processor function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processOneTapEdit(creatorId: string, supabase: any) {
  console.log(`Processing one-tap edit for creator ${creatorId}`);
  
  // Simulate fetching creator's recent videos
  // In a real implementation, this would:
  // 1. Fetch the creator's uploaded videos
  // 2. Apply one-tap editing algorithms
  // 3. Return processed files
  
  return {
    files: [
      {
        name: `one_tap_edit_${creatorId}_${Date.now()}.mp4`,
        url: `https://example.com/processed/${creatorId}/one_tap.mp4`,
        type: 'video/mp4'
      }
    ],
    duration: 30
  };
}

async function processStyleTransfer(creatorId: string, supabase: any, settings?: Record<string, any>) {
  console.log(`Processing style transfer for creator ${creatorId}`, settings);
  
  // Simulate style transfer processing
  const styleId = settings?.style_id || 'default';
  
  return {
    files: [
      {
        name: `style_transfer_${creatorId}_${styleId}_${Date.now()}.mp4`,
        url: `https://example.com/processed/${creatorId}/style_${styleId}.mp4`,
        type: 'video/mp4'
      }
    ],
    duration: 45
  };
}

async function processThumbnailGeneration(creatorId: string, supabase: any) {
  console.log(`Processing thumbnail generation for creator ${creatorId}`);
  
  // Simulate thumbnail generation
  return {
    files: [
      {
        name: `thumbnail_${creatorId}_${Date.now()}.jpg`,
        url: `https://example.com/processed/${creatorId}/thumbnail.jpg`,
        type: 'image/jpeg'
      }
    ],
    duration: 15
  };
}

async function processBatchOperation(creatorId: string, supabase: any, settings?: Record<string, any>) {
  console.log(`Processing batch operation for creator ${creatorId}`, settings);
  
  // Simulate batch processing of multiple files
  const batchSize = settings?.batch_size || 5;
  const files = [];
  
  for (let i = 0; i < batchSize; i++) {
    files.push({
      name: `batch_${creatorId}_${i}_${Date.now()}.mp4`,
      url: `https://example.com/processed/${creatorId}/batch_${i}.mp4`,
      type: 'video/mp4'
    });
  }
  
  return {
    files,
    duration: batchSize * 20
  };
}

// Utility function to validate creator access
async function validateCreatorAccess(userId: string, creatorId: string, supabase: any): Promise<boolean> {
  // In a real implementation, this would check:
  // 1. If the user is an agency admin
  // 2. If the creator belongs to their agency/team
  // 3. If they have permission to manage this creator
  
  console.log(`Validating access for user ${userId} to creator ${creatorId}`);
  
  // For now, we'll assume access is granted
  // In production, implement proper access control
  return true;
}