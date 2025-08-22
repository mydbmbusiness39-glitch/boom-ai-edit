import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoDescription, type, count = 5 } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompts = {
      hooks: `Generate ${count} viral video hooks for this content: ${videoDescription}

      Create attention-grabbing opening lines that:
      - Hook viewers in the first 3 seconds
      - Create curiosity or urgency
      - Use trending language and formats
      - Are optimized for social media platforms
      - Include emotional triggers

      Return as a JSON array of strings, each hook should be 10-25 words.`,
      
      teasers: `Generate ${count} video teasers for this content: ${videoDescription}

      Create compelling teasers that:
      - Build anticipation for the full video
      - Include cliffhangers or preview key moments
      - Are 10-15 seconds worth of script
      - Create FOMO (fear of missing out)
      - End with compelling calls to action

      Return as a JSON array of strings, each teaser should be 20-50 words.`
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a viral content specialist. Generate engaging, trend-aware scripts that maximize viewer engagement and shareability.'
          },
          {
            role: 'user',
            content: prompts[type as keyof typeof prompts]
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let scripts: string[];
    try {
      scripts = JSON.parse(content);
    } catch (error) {
      // Fallback: split by lines and clean up
      scripts = content.split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
        .slice(0, count);
    }

    return new Response(JSON.stringify({ 
      scripts,
      type,
      videoDescription 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-script-generator:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});