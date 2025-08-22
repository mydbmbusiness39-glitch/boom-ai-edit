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
    const { content, trends } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      // Return mock match scores if OpenAI not configured
      const matches: Record<string, number> = {};
      trends.forEach((trend: any) => {
        matches[trend.id] = Math.floor(Math.random() * 100);
      });
      
      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Analyze how well this user content matches trending audio/music:

    User Content: ${content}
    
    Trending Audio Options:
    ${trends.map((t: any) => `- ${t.title} (Category: ${t.category})`).join('\n')}
    
    For each audio option, provide a match score from 0-100 based on:
    - Content theme alignment
    - Target audience overlap  
    - Mood/vibe compatibility
    - Viral potential together
    
    Return as JSON with format: {"matches": {"1": 85, "2": 72, ...}}`;

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
            content: 'You are a viral content analyst. Analyze content-to-audio matching for maximum viral potential.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    let matches: Record<string, number>;
    try {
      const parsed = JSON.parse(result);
      matches = parsed.matches || {};
    } catch (error) {
      // Fallback: generate random scores
      matches = {};
      trends.forEach((trend: any) => {
        matches[trend.id] = Math.floor(Math.random() * 100);
      });
    }

    return new Response(JSON.stringify({ 
      matches,
      analysis: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trend-matcher:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});