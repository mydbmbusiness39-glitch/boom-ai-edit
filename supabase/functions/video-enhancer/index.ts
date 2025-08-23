import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoEnhancementRequest {
  video_url: string;
  enhancement_type: 'face_crop' | 'jump_cut_cleanup' | 'animated_captions' | 'all';
  options?: {
    // Face cropping options
    target_aspect_ratio?: '9:16' | '16:9' | '1:1' | '4:5';
    face_padding?: number;
    tracking_smoothness?: 'low' | 'medium' | 'high';
    
    // Jump cut options
    silence_threshold?: number;
    min_pause_duration?: number;
    remove_filler_words?: boolean;
    keep_natural_pauses?: boolean;
    
    // Caption options
    brand_color?: string;
    font_family?: string;
    animation_style?: 'pop' | 'slide' | 'fade' | 'bounce';
    add_emojis?: boolean;
    highlight_keywords?: boolean;
    caption_position?: 'bottom' | 'center' | 'top';
  };
}

interface EnhancementResult {
  enhanced_video_url?: string;
  face_crop_data?: {
    faces_detected: number;
    crop_coordinates: Array<{
      timestamp: number;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>;
    aspect_ratio_optimized: string;
  };
  jump_cut_data?: {
    cuts_made: number;
    time_saved_seconds: number;
    segments_removed: Array<{
      start: number;
      end: number;
      type: 'silence' | 'filler_word' | 'pause';
      content?: string;
    }>;
  };
  caption_data?: {
    captions_generated: number;
    sync_accuracy: number;
    animations_applied: number;
    subtitle_file_url?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { video_url, enhancement_type, options = {} } = await req.json() as VideoEnhancementRequest;

    if (!video_url) {
      throw new Error('video_url is required');
    }

    console.log('Starting video enhancement:', { enhancement_type, video_url });

    const results: EnhancementResult = {};

    if (enhancement_type === 'face_crop' || enhancement_type === 'all') {
      results.face_crop_data = await processFaceCropping(video_url, options);
    }

    if (enhancement_type === 'jump_cut_cleanup' || enhancement_type === 'all') {
      results.jump_cut_data = await processJumpCutCleanup(video_url, options);
    }

    if (enhancement_type === 'animated_captions' || enhancement_type === 'all') {
      results.caption_data = await processAnimatedCaptions(video_url, options);
    }

    // Generate enhanced video URL (mock for demo)
    results.enhanced_video_url = `${video_url.replace('.mp4', '')}_enhanced.mp4`;

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Video enhancement error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processFaceCropping(video_url: string, options: any) {
  // Mock face detection and cropping - would use computer vision AI
  const targetAspectRatio = options.target_aspect_ratio || '9:16';
  const facePadding = options.face_padding || 0.2;
  
  const mockFaceData = {
    faces_detected: 1,
    crop_coordinates: [
      {
        timestamp: 0,
        x: 120,
        y: 80,
        width: 200,
        height: 300,
        confidence: 0.94
      },
      {
        timestamp: 5.5,
        x: 130,
        y: 85,
        width: 195,
        height: 295,
        confidence: 0.91
      },
      {
        timestamp: 12.3,
        x: 125,
        y: 82,
        width: 205,
        height: 305,
        confidence: 0.96
      }
    ],
    aspect_ratio_optimized: targetAspectRatio
  };

  console.log('Face cropping processed:', mockFaceData.faces_detected, 'faces detected');
  return mockFaceData;
}

async function processJumpCutCleanup(video_url: string, options: any) {
  // Mock jump cut analysis - would use audio analysis AI
  const silenceThreshold = options.silence_threshold || -40; // dB
  const minPauseDuration = options.min_pause_duration || 0.8; // seconds
  const removeFillerWords = options.remove_filler_words ?? true;

  const mockJumpCutData = {
    cuts_made: 23,
    time_saved_seconds: 45.7,
    segments_removed: [
      {
        start: 8.2,
        end: 10.1,
        type: 'silence' as const,
      },
      {
        start: 15.5,
        end: 16.3,
        type: 'filler_word' as const,
        content: 'um'
      },
      {
        start: 28.7,
        end: 31.2,
        type: 'pause' as const,
      },
      {
        start: 42.1,
        end: 42.8,
        type: 'filler_word' as const,
        content: 'uh'
      },
      {
        start: 67.3,
        end: 69.9,
        type: 'silence' as const,
      }
    ]
  };

  console.log('Jump cut cleanup processed:', mockJumpCutData.cuts_made, 'cuts made');
  return mockJumpCutData;
}

async function processAnimatedCaptions(video_url: string, options: any) {
  // Mock caption generation - would use speech-to-text + animation AI
  const brandColor = options.brand_color || '#3B82F6';
  const animationStyle = options.animation_style || 'pop';
  const addEmojis = options.add_emojis ?? true;
  const highlightKeywords = options.highlight_keywords ?? true;

  // Generate captions with OpenAI for demo
  const mockCaptionData = {
    captions_generated: 45,
    sync_accuracy: 0.97,
    animations_applied: 45,
    subtitle_file_url: `${video_url.replace('.mp4', '')}_captions.srt`
  };

  console.log('Animated captions processed:', mockCaptionData.captions_generated, 'captions generated');
  return mockCaptionData;
}

// Helper function to generate animated captions with AI
async function generateAICaptions(text: string, options: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating engaging, animated captions for social media videos. 
            Generate captions that:
            - Add relevant emojis ${options.add_emojis ? '✅' : '❌'}
            - Highlight key words ${options.highlight_keywords ? '✅' : '❌'}
            - Use brand color: ${options.brand_color || '#3B82F6'}
            - Animation style: ${options.animation_style || 'pop'}
            
            Format as SRT subtitle file with animation cues.`
          },
          {
            role: 'user',
            content: `Generate animated captions for this transcript: "${text}"`
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('AI caption generation error:', error);
    return null;
  }
}