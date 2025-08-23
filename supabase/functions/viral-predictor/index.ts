import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ViralPredictionRequest {
  action: 'predict_viral_score' | 'analyze_performance' | 'get_insights' | 'update_performance';
  clip_data?: {
    title?: string;
    description?: string;
    duration?: number;
    thumbnail_url?: string;
    video_url?: string;
    platform?: string;
    hashtags?: string[];
    audio_track?: string;
  };
  performance_data?: {
    clip_id?: string;
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
    watch_time?: number;
    platform?: string;
  };
  user_context?: {
    follower_count?: number;
    previous_viral_clips?: number;
    average_engagement_rate?: number;
    niche?: string;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!userData.user) {
      throw new Error('Unauthorized');
    }

    const { action, clip_data, performance_data, user_context } = await req.json() as ViralPredictionRequest;

    let result: any = {};

    switch (action) {
      case 'predict_viral_score':
        result = await predictViralScore(clip_data!, user_context, openAIApiKey);
        break;
      
      case 'analyze_performance':
        result = await analyzePerformance(performance_data!, supabase, userData.user.id);
        break;
      
      case 'get_insights':
        result = await getViralInsights(userData.user.id, supabase);
        break;
      
      case 'update_performance':
        result = await updatePerformanceMetrics(performance_data!, supabase, userData.user.id);
        break;
      
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Viral predictor error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function predictViralScore(clipData: any, userContext: any = {}, openAIApiKey: string) {
  try {
    // Generate AI-powered viral prediction
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
            content: `You are an expert social media analyst specializing in viral content prediction. 
            Analyze the provided content and predict its viral potential based on:
            - Content quality and engagement factors
            - Platform-specific algorithms
            - Current trends and timing
            - User context and audience
            
            Return a JSON object with:
            - viral_score (0-100)
            - confidence_level (0-1)
            - predicted_max_views (integer)
            - viral_factors (array of key factors)
            - improvement_suggestions (array)
            - optimal_posting_times (array)
            - risk_factors (array)`
          },
          {
            role: 'user',
            content: `Analyze this clip for viral potential:
            
            Title: ${clipData.title || 'No title'}
            Description: ${clipData.description || 'No description'}
            Duration: ${clipData.duration || 'Unknown'} seconds
            Platform: ${clipData.platform || 'Unknown'}
            Hashtags: ${clipData.hashtags?.join(', ') || 'None'}
            
            User Context:
            - Followers: ${userContext.follower_count || 0}
            - Previous viral clips: ${userContext.previous_viral_clips || 0}
            - Avg engagement: ${userContext.average_engagement_rate || 0}%
            - Niche: ${userContext.niche || 'Unknown'}`
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    const aiResult = await response.json();
    let prediction;
    
    try {
      prediction = JSON.parse(aiResult.choices[0].message.content);
    } catch {
      // Fallback if AI doesn't return valid JSON
      prediction = generateFallbackPrediction(clipData, userContext);
    }

    return {
      viral_prediction_score: prediction.viral_score || 65,
      confidence_level: prediction.confidence_level || 0.75,
      predicted_max_views: prediction.predicted_max_views || 50000,
      viral_factors: prediction.viral_factors || [
        'Engaging hook in first 3 seconds',
        'Trending audio/music',
        'Clear visual storytelling'
      ],
      improvement_suggestions: prediction.improvement_suggestions || [
        'Add more dynamic transitions',
        'Include trending hashtags',
        'Post during peak hours'
      ],
      optimal_posting_times: prediction.optimal_posting_times || [
        { day: 'Tuesday', hour: '7:00 PM', platform: 'tiktok' },
        { day: 'Thursday', hour: '8:00 PM', platform: 'instagram_reels' }
      ],
      risk_factors: prediction.risk_factors || [
        'Content may be too niche',
        'Low follower engagement history'
      ]
    };

  } catch (error) {
    console.error('AI prediction error:', error);
    return generateFallbackPrediction(clipData, userContext);
  }
}

function generateFallbackPrediction(clipData: any, userContext: any = {}) {
  // Generate mock prediction based on basic heuristics
  let score = 50;
  
  // Adjust score based on factors
  if (clipData.title && clipData.title.length > 0) score += 10;
  if (clipData.hashtags && clipData.hashtags.length > 3) score += 15;
  if (clipData.duration && clipData.duration >= 15 && clipData.duration <= 60) score += 10;
  if (userContext.follower_count > 1000) score += 10;
  if (userContext.average_engagement_rate > 5) score += 15;
  
  return {
    viral_prediction_score: Math.min(score, 95),
    confidence_level: 0.7,
    predicted_max_views: Math.floor(score * 1000),
    viral_factors: ['Good content structure', 'Appropriate length', 'Engaging elements'],
    improvement_suggestions: ['Add trending audio', 'Optimize posting time', 'Use more hashtags'],
    optimal_posting_times: [
      { day: 'Tuesday', hour: '7:00 PM', platform: clipData.platform || 'tiktok' }
    ]
  };
}

async function analyzePerformance(performanceData: any, supabase: any, userId: string) {
  // Mock performance analysis - would integrate with platform APIs
  const analysisResult = {
    performance_grade: 'B+',
    growth_rate: 12.5,
    engagement_quality: 'High',
    viral_potential: 'Medium-High',
    comparison_metrics: {
      vs_last_week: '+15%',
      vs_average: '+8%',
      vs_top_performers: '-23%'
    },
    key_insights: [
      'Strong initial engagement in first hour',
      'Comments indicate high audience retention',
      'Shares trending upward - good sign for algorithm boost'
    ],
    recommendations: [
      'Post similar content during peak hours',
      'Engage with comments within first 2 hours',
      'Create follow-up content while momentum is high'
    ]
  };

  console.log('Performance analyzed:', performanceData);
  return analysisResult;
}

async function getViralInsights(userId: string, supabase: any) {
  try {
    // Get user's viral insights
    const { data: insights, error } = await supabase
      .from('viral_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Get recent clip performances
    const { data: performances, error: perfError } = await supabase
      .from('clip_performances')
      .select('*')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(20);

    if (perfError) throw perfError;

    return {
      recent_insights: insights || [],
      performance_summary: {
        total_clips: performances?.length || 0,
        avg_viral_score: performances?.reduce((acc: number, p: any) => 
          acc + (p.viral_prediction_score || 0), 0) / (performances?.length || 1),
        best_performing_platform: 'tiktok', // Would calculate from actual data
        total_views: performances?.reduce((acc: number, p: any) => acc + (p.views || 0), 0) || 0
      },
      trending_factors: [
        'Short-form vertical content',
        'Trending audio usage', 
        'Hook within 3 seconds',
        'Clear call-to-action'
      ]
    };

  } catch (error) {
    console.error('Error getting insights:', error);
    return {
      recent_insights: [],
      performance_summary: {},
      trending_factors: []
    };
  }
}

async function updatePerformanceMetrics(performanceData: any, supabase: any, userId: string) {
  try {
    if (!performanceData.clip_id) {
      throw new Error('clip_id is required for updating performance');
    }

    const updateData = {
      views: performanceData.views,
      likes: performanceData.likes,
      shares: performanceData.shares,
      comments: performanceData.comments,
      watch_time_seconds: performanceData.watch_time,
      last_updated: new Date().toISOString()
    };

    // Update performance metrics
    const { data, error } = await supabase
      .from('clip_performances')
      .update(updateData)
      .eq('id', performanceData.clip_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Create performance snapshot
    await supabase
      .from('performance_snapshots')
      .insert({
        clip_performance_id: performanceData.clip_id,
        views_delta: performanceData.views || 0,
        likes_delta: performanceData.likes || 0,
        shares_delta: performanceData.shares || 0,
        comments_delta: performanceData.comments || 0,
        snapshot_date: new Date().toISOString().split('T')[0]
      });

    return {
      updated_performance: data,
      message: 'Performance metrics updated successfully'
    };

  } catch (error) {
    console.error('Error updating performance:', error);
    throw error;
  }
}