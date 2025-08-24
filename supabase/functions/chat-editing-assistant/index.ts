import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EditingCommand {
  action: string;
  parameters: Record<string, any>;
  status: 'processing' | 'completed' | 'failed';
}

interface ChatRequest {
  message: string;
  projectData: any;
  context: Array<{ type: string; content: string; timestamp: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, projectData, context }: ChatRequest = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context for the AI
    const systemPrompt = `You are an AI video editing assistant for BOOM, a video creation platform. 
    
Your role is to:
1. Interpret natural language editing commands
2. Generate specific editing instructions
3. Provide friendly, helpful responses

Available editing actions:
- "cut_boring_parts": Remove slow/static segments
- "add_captions": Add text overlays with style (drake, minimal, bold, etc.)
- "turn_to_meme": Apply meme templates and viral effects
- "remove_silence": Cut silent audio segments
- "add_transitions": Add viral transition effects
- "optimize_tiktok": Format for TikTok (9:16, 15-60s)
- "beat_sync": Sync cuts to music beats
- "auto_crop": Smart crop for platform requirements
- "color_grade": Apply color styling (rgb, luxury, vintage, etc.)
- "speed_ramp": Add speed variations for engagement

Current project context:
- Files: ${projectData?.files?.length || 0} media files
- Duration: ${projectData?.duration || 'Unknown'} seconds
- Style: ${projectData?.style || 'None'}
- Music: ${projectData?.music || 'None'}

Respond with a JSON object containing:
{
  "response": "Your friendly response explaining what you'll do",
  "command": {
    "action": "specific_action_name",
    "parameters": { /* relevant parameters */ },
    "status": "processing"
  }
}

If the request is unclear or not editing-related, respond with helpful guidance but no command object.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...context.slice(-3).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log('Processing editing command:', message);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let result;
    
    try {
      result = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', data.choices[0].message.content);
      // Fallback response
      result = {
        response: data.choices[0].message.content,
        command: null
      };
    }

    // Validate and process the command
    if (result.command) {
      result.command = await processEditingCommand(result.command, projectData);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat assistant error:', error);
    
    return new Response(JSON.stringify({ 
      response: "I encountered an error processing your request. Please try again with a simpler command.",
      command: null,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processEditingCommand(command: EditingCommand, projectData: any): Promise<EditingCommand> {
  try {
    console.log('Processing editing command:', command.action);
    
    // Simulate command processing with realistic parameters
    switch (command.action) {
      case 'cut_boring_parts':
        command.parameters = {
          threshold: 0.3,
          min_segment_length: 2,
          detected_segments: Math.floor(Math.random() * 5) + 1
        };
        break;
        
      case 'add_captions':
        const style = command.parameters.style || 'drake';
        command.parameters = {
          style,
          font_size: style === 'drake' ? 'large' : 'medium',
          position: style === 'drake' ? 'center' : 'bottom',
          color: style === 'drake' ? 'white' : 'auto',
          segments: Math.floor((projectData?.duration || 15) / 3)
        };
        break;
        
      case 'turn_to_meme':
        command.parameters = {
          template: 'viral_zoom',
          effects: ['zoom_punch', 'bass_boost', 'emoji_reactions'],
          duration_adjustments: true
        };
        break;
        
      case 'remove_silence':
        command.parameters = {
          silence_threshold: -40,
          min_silence_duration: 0.5,
          removed_segments: Math.floor(Math.random() * 3) + 1
        };
        break;
        
      case 'add_transitions':
        command.parameters = {
          transition_type: 'viral_cuts',
          beat_sync: true,
          transition_count: Math.floor((projectData?.files?.length || 1) - 1)
        };
        break;
        
      case 'optimize_tiktok':
        command.parameters = {
          aspect_ratio: '9:16',
          target_duration: Math.min(60, projectData?.duration || 15),
          auto_crop: true,
          vertical_format: true
        };
        break;
        
      default:
        command.parameters = { applied: true };
    }
    
    command.status = 'completed';
    return command;
    
  } catch (error) {
    console.error('Error processing command:', error);
    command.status = 'failed';
    return command;
  }
}