import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup job...');

    // Delete uploads older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldUploads, error: selectError } = await supabase
      .from('uploads')
      .select('file_path')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (selectError) {
      console.error('Error selecting old uploads:', selectError);
      throw selectError;
    }

    console.log(`Found ${oldUploads?.length || 0} uploads to clean up`);

    // Delete files from storage
    if (oldUploads && oldUploads.length > 0) {
      const filePaths = oldUploads.map(upload => upload.file_path);
      
      const { error: storageError } = await supabase.storage
        .from('video-uploads')
        .remove(filePaths);

      if (storageError) {
        console.error('Error deleting files from storage:', storageError);
      } else {
        console.log(`Deleted ${filePaths.length} files from storage`);
      }

      // Delete upload records
      const { error: deleteError } = await supabase
        .from('uploads')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString());

      if (deleteError) {
        console.error('Error deleting upload records:', deleteError);
        throw deleteError;
      }

      console.log(`Deleted ${oldUploads.length} upload records`);
    }

    // Reset daily job counts for users (new day)
    const { error: resetError } = await supabase
      .from('profiles')
      .update({ jobs_today: 0 })
      .neq('last_job_date', new Date().toDateString());

    if (resetError) {
      console.error('Error resetting daily job counts:', resetError);
    } else {
      console.log('Reset daily job counts for new day');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Cleanup completed. Processed ${oldUploads?.length || 0} old uploads.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});