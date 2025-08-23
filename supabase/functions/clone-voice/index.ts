import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { modelId, audioUrl, modelName } = await req.json();
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Clone voice using ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        name: modelName,
        files: [{ url: audioUrl }],
        description: `AI voice clone for ${modelName}`
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail?.message || 'Voice cloning failed');
    }

    console.log('Voice cloned successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        voice_id: result.voice_id,
        message: 'Voice cloning initiated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice cloning error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Voice cloning failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});