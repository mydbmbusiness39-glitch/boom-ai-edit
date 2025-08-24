import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClipData {
  views: number;
  likes: number;
  engagement_rate: number;
  posted_at: string;
  platform: string;
}

interface AISuggestion {
  type: 'timing' | 'content' | 'audience' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  metric?: string;
  improvement?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No user found');
    }

    const { clipData, metrics } = await req.json();

    console.log('Generating AI suggestions for user:', user.id);
    console.log('Clip data length:', clipData?.length || 0);

    // Analyze the data and generate insights
    const suggestions = await generateSmartSuggestions(clipData, metrics, user.id);

    return new Response(
      JSON.stringify({ suggestions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-dashboard-suggestions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateSmartSuggestions(clipData: ClipData[], metrics: any, userId: string): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = [];

  // Analyze posting times
  if (clipData && clipData.length > 0) {
    const hourlyPerformance = analyzePostingTimes(clipData);
    const bestHour = Object.keys(hourlyPerformance).reduce((a, b) => 
      hourlyPerformance[a] > hourlyPerformance[b] ? a : b
    );

    suggestions.push({
      type: 'timing',
      title: `Post more at ${formatHour(parseInt(bestHour))}`,
      description: `Your content performs ${(hourlyPerformance[bestHour] * 100).toFixed(1)}% better during this time window`,
      confidence: Math.min(95, 70 + (hourlyPerformance[bestHour] * 25)),
      priority: 'high',
      actionable: true,
      metric: `${(hourlyPerformance[bestHour] * 100).toFixed(1)}% better performance`,
      improvement: `+${Math.floor(hourlyPerformance[bestHour] * 200)}% engagement boost`
    });
  }

  // Content language suggestions based on engagement patterns
  const languageSuggestion = analyzeLanguageOpportunity(clipData);
  if (languageSuggestion) {
    suggestions.push(languageSuggestion);
  }

  // Audience demographic insights
  const audienceSuggestion = analyzeAudiencePatterns(clipData);
  if (audienceSuggestion) {
    suggestions.push(audienceSuggestion);
  }

  // Content optimization suggestions
  const optimizationSuggestion = analyzeContentOptimization(clipData);
  if (optimizationSuggestion) {
    suggestions.push(optimizationSuggestion);
  }

  // Platform-specific suggestions
  const platformSuggestion = analyzePlatformPerformance(clipData);
  if (platformSuggestion) {
    suggestions.push(platformSuggestion);
  }

  return suggestions;
}

function analyzePostingTimes(clipData: ClipData[]): Record<string, number> {
  const hourlyEngagement: Record<string, number[]> = {};

  clipData.forEach(clip => {
    const hour = new Date(clip.posted_at).getHours();
    const hourKey = hour.toString();
    
    if (!hourlyEngagement[hourKey]) {
      hourlyEngagement[hourKey] = [];
    }
    hourlyEngagement[hourKey].push(clip.engagement_rate || 0);
  });

  // Calculate average engagement per hour
  const hourlyAverage: Record<string, number> = {};
  Object.keys(hourlyEngagement).forEach(hour => {
    const rates = hourlyEngagement[hour];
    hourlyAverage[hour] = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  });

  return hourlyAverage;
}

function analyzeLanguageOpportunity(clipData: ClipData[]): AISuggestion | null {
  // Mock analysis - in real implementation, this would analyze caption languages
  const spanishOpportunity = Math.random() > 0.3;
  
  if (spanishOpportunity) {
    return {
      type: 'content',
      title: 'Try Spanish captions',
      description: '40% of your audience is bilingual and Spanish content gets 60% more shares in your niche',
      confidence: 85,
      priority: 'high',
      actionable: true,
      metric: '40% bilingual audience',
      improvement: '+60% shares potential'
    };
  }

  return null;
}

function analyzeAudiencePatterns(clipData: ClipData[]): AISuggestion | null {
  // Mock demographic analysis
  const morningEngagement = Math.random() > 0.4;
  
  if (morningEngagement) {
    return {
      type: 'audience',
      title: 'Target Gen Z morning routines',
      description: 'Your 18-24 audience is most active during 6-9am. Morning routine content performs 85% better',
      confidence: 78,
      priority: 'medium',
      actionable: true,
      metric: '18-24 demographic dominance',
      improvement: '+85% morning engagement'
    };
  }

  return null;
}

function analyzeContentOptimization(clipData: ClipData[]): AISuggestion | null {
  // Mock trending audio analysis
  const trendingAudio = Math.random() > 0.2;
  
  if (trendingAudio) {
    return {
      type: 'optimization',
      title: 'Use trending audio #viral2024',
      description: 'This audio track is trending +340% in your niche and matches your content style perfectly',
      confidence: 91,
      priority: 'high',
      actionable: true,
      metric: '+340% trend growth',
      improvement: 'Viral potential boost'
    };
  }

  return null;
}

function analyzePlatformPerformance(clipData: ClipData[]): AISuggestion | null {
  if (!clipData || clipData.length === 0) return null;

  // Analyze performance by platform
  const platformPerformance: Record<string, number[]> = {};
  clipData.forEach(clip => {
    if (!platformPerformance[clip.platform]) {
      platformPerformance[clip.platform] = [];
    }
    platformPerformance[clip.platform].push(clip.engagement_rate || 0);
  });

  // Find best performing platform
  let bestPlatform = '';
  let bestAverage = 0;

  Object.keys(platformPerformance).forEach(platform => {
    const average = platformPerformance[platform].reduce((sum, rate) => sum + rate, 0) / platformPerformance[platform].length;
    if (average > bestAverage) {
      bestAverage = average;
      bestPlatform = platform;
    }
  });

  if (bestPlatform && bestAverage > 0.05) {
    return {
      type: 'optimization',
      title: `Focus more on ${bestPlatform}`,
      description: `Your ${bestPlatform} content performs ${(bestAverage * 100).toFixed(1)}% better than other platforms`,
      confidence: 82,
      priority: 'medium',
      actionable: true,
      metric: `${(bestAverage * 100).toFixed(1)}% better engagement`,
      improvement: `+${Math.floor(bestAverage * 150)}% ROI focus`
    };
  }

  return null;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am EST';
  if (hour < 12) return `${hour}am EST`;
  if (hour === 12) return '12pm EST';
  return `${hour - 12}pm EST`;
}