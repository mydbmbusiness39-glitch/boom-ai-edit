import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { avatarId, avatarType, animationStyle, name } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate avatar image prompt based on type and style
    const avatarPrompts = {
      cartoon: `Create a ${animationStyle} cartoon character for ${name}. Style: Disney/Pixar-like 3D character, expressive face, suitable for video host/commentary. Clean background.`,
      realistic: `Create a ${animationStyle} realistic digital human character for ${name}. Professional appearance, suitable for video host/commentary. Clean studio background.`,
      anime: `Create a ${animationStyle} anime-style character for ${name}. Japanese animation style, expressive, suitable for video host/commentary. Clean background.`,
      pixar: `Create a ${animationStyle} Pixar-style 3D character for ${name}. High-quality 3D rendering, expressive and appealing, suitable for video host/commentary.`,
      minimal: `Create a ${animationStyle} minimal design character for ${name}. Simple, clean lines, modern design, suitable for video host/commentary. Minimalist background.`
    };

    const prompt = avatarPrompts[avatarType as keyof typeof avatarPrompts] || avatarPrompts.cartoon;

    // Generate avatar using OpenAI DALL-E
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        output_format: 'png'
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Avatar generation failed');
    }

    // Get the base64 image
    const imageData = result.data[0].b64_json;
    const avatarUrl = `data:image/png;base64,${imageData}`;

    console.log('Avatar generated successfully for:', name);

    // Generate animation sprites for different expressions
    const expressions = ['happy', 'surprised', 'thinking', 'excited', 'nodding'];
    const animationSprites = await generateAnimationSprites(prompt, expressions, OPENAI_API_KEY);

    return new Response(
      JSON.stringify({ 
        success: true,
        avatarUrl,
        animationSprites,
        message: 'Avatar generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Avatar generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Avatar generation failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateAnimationSprites(basePrompt: string, expressions: string[], apiKey: string) {
  const sprites = [];
  
  for (const expression of expressions) {
    try {
      const expressionPrompt = `${basePrompt} Expression: ${expression}. Same character, same style, only facial expression changes.`;
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: expressionPrompt,
          n: 1,
          size: '512x512',
          quality: 'standard',
          output_format: 'png'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.data?.[0]?.b64_json) {
        sprites.push({
          expression,
          imageData: `data:image/png;base64,${result.data[0].b64_json}`
        });
      }
    } catch (error) {
      console.error(`Error generating ${expression} sprite:`, error);
    }
  }
  
  return sprites;
}