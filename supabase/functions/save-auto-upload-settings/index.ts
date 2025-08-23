import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AutoUploadSettings {
  enabled: boolean;
  defaultCaption: string;
  optimalTiming: boolean;
  crossPost: boolean;
  addWatermark: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid or expired token');
    }

    const settings: AutoUploadSettings = await req.json();
    console.log(`Saving auto-upload settings for user: ${user.id}`);

    // Save settings to database (using a hypothetical user_settings table)
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        auto_upload_enabled: settings.enabled,
        default_caption: settings.defaultCaption,
        optimal_timing: settings.optimalTiming,
        cross_post: settings.crossPost,
        add_watermark: settings.addWatermark,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to save settings to database');
    }

    console.log('Auto-upload settings saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-upload settings saved successfully',
        settings: data
      }),
      { 
        status: 200, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Save settings error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to save auto-upload settings',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});