import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatarId, scriptType, customText, stylePrompt, brandColors } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate script content if not custom
    let scriptContent = customText;
    
    if (scriptType !== 'custom') {
      scriptContent = await generateScriptContent(scriptType, stylePrompt, OPENAI_API_KEY);
    }

    // Generate background/scene for the host video
    const backgroundPrompt = generateBackgroundPrompt(scriptType, brandColors, stylePrompt);
    const background = await generateBackground(backgroundPrompt, OPENAI_API_KEY);

    // If ElevenLabs is available, generate voice
    let voiceAudio = null;
    if (ELEVENLABS_API_KEY && avatarId) {
      try {
        voiceAudio = await generateVoiceAudio(scriptContent, avatarId, ELEVENLABS_API_KEY);
      } catch (error) {
        console.warn('Voice generation failed:', error);
      }
    }

    // Create video composition data
    const videoComposition = {
      script: scriptContent,
      background,
      voiceAudio,
      duration: estimateVideoDuration(scriptContent),
      avatarId,
      style: {
        colors: brandColors,
        prompt: stylePrompt,
        type: scriptType
      }
    };

    console.log('Host video composition created:', {
      scriptLength: scriptContent.length,
      hasVoice: !!voiceAudio,
      duration: videoComposition.duration
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        composition: videoComposition,
        message: 'Host video generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Host video generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Host video generation failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateScriptContent(scriptType: string, stylePrompt: string, apiKey: string): Promise<string> {
  const systemPrompts = {
    intro: "You are a video content creator. Generate an engaging 15-20 second video intro script that hooks viewers immediately.",
    outro: "You are a video content creator. Generate a compelling 15-20 second video outro with strong call-to-action.",
    transition: "You are a video content creator. Generate a smooth 10-15 second transition segment for video sections.",
    cta: "You are a marketing expert. Generate a persuasive 15-20 second call-to-action script for video content."
  };

  const userPrompt = `Create a ${scriptType} script. Style: ${stylePrompt || 'energetic and engaging'}. Keep it concise, punchy, and perfect for social media. No stage directions, just the spoken words.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompts[scriptType as keyof typeof systemPrompts] || systemPrompts.intro },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.8
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error('Script generation failed');
  }

  return result.choices[0].message.content.trim();
}

function generateBackgroundPrompt(scriptType: string, brandColors: string[], stylePrompt: string): string {
  const colorList = Array.isArray(brandColors) ? brandColors.join(', ') : brandColors;
  
  const basePrompts = {
    intro: `Modern, energetic background for video intro. Colors: ${colorList}. ${stylePrompt}. Professional studio setup, clean and appealing.`,
    outro: `Professional background for video outro. Colors: ${colorList}. ${stylePrompt}. Clean, branded appearance.`,
    transition: `Smooth transition background. Colors: ${colorList}. ${stylePrompt}. Subtle, non-distracting.`,
    cta: `Eye-catching background for call-to-action. Colors: ${colorList}. ${stylePrompt}. Compelling and action-oriented.`
  };

  return basePrompts[scriptType as keyof typeof basePrompts] || basePrompts.intro;
}

async function generateBackground(prompt: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
      output_format: 'png'
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error('Background generation failed');
  }

  return {
    imageData: `data:image/png;base64,${result.data[0].b64_json}`,
    prompt
  };
}

async function generateVoiceAudio(text: string, avatarId: string, elevenLabsKey: string) {
  // For now, return a placeholder - would need actual voice model ID
  return {
    audioUrl: null,
    duration: estimateVideoDuration(text),
    text
  };
}

function estimateVideoDuration(text: string): number {
  // Rough estimate: 150 words per minute = 2.5 words per second
  const wordCount = text.split(' ').length;
  return Math.max(10, Math.ceil(wordCount / 2.5));
}