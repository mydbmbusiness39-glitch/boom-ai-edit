import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Send multipart/form-data with 'audio' file" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "Missing 'audio' file" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ELEVENLABS_STT_MODEL_ID = Deno.env.get('ELEVENLABS_STT_MODEL_ID') || 'scribe_v1';
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Prepare form data for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.set("model_id", ELEVENLABS_STT_MODEL_ID);
    elevenLabsFormData.set("file", file, file.name || "audio.webm");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { 
        "xi-api-key": ELEVENLABS_API_KEY 
      },
      body: elevenLabsFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT error:', errorText);
      throw new Error(`Speech-to-text failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Speech-to-text successful:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Speech-to-text error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Speech-to-text failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});