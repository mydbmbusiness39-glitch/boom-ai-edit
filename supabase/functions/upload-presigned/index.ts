import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
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

    // Create client with user token
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

    const { fileName, fileType, fileSize }: PresignedUrlRequest = await req.json();

    // Validate file type
    const allowedTypes = [
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    ];

    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} not allowed`);
    }

    // Validate file size (100MB limit for free tier)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileSize > maxSize) {
      throw new Error('File size too large (max 100MB for free tier)');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `uploads/${user.id}/${timestamp}_${cleanFileName}`;

    // Generate presigned URL for upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-uploads')
      .createSignedUploadUrl(filePath, {
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to create upload URL: ${uploadError.message}`);
    }

    // Record upload in database
    const { data: upload, error: dbError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        filename: fileName,
        file_path: filePath,
        file_size: fileSize,
        mime_type: fileType
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue anyway, upload is more important
    }

    console.log(`Generated presigned URL for ${fileName}`);

    return new Response(JSON.stringify({ 
      success: true,
      uploadUrl: uploadData.signedUrl,
      filePath,
      uploadId: upload?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Presigned URL error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});