import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ViralMomentRequest {
  video_url?: string;
  audio_url?: string;
  analysis_type: 'viral_moments' | 'wow_detector' | 'chapter_split' | 'all';
  options?: {
    sensitivity?: 'low' | 'medium' | 'high';
    min_segment_duration?: number;
    max_segments?: number;
    include_audio_analysis?: boolean;
    include_visual_analysis?: boolean;
  };
}

interface ViralMoment {
  timestamp: number;
  duration: number;
  confidence: number;
  type: 'laughter' | 'hype_word' | 'energy_spike' | 'wow_reaction' | 'topic_change';
  description: string;
  suggested_cut: {
    start: number;
    end: number;
    title?: string;
  };
  viral_score: number;
}

interface ChapterSegment {
  start_time: number;
  end_time: number;
  title: string;
  topic: string;
  summary: string;
  key_points: string[];
  viral_potential: number;
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

    const { video_url, audio_url, analysis_type, options = {} } = await req.json() as ViralMomentRequest;

    if (!video_url && !audio_url) {
      throw new Error('Either video_url or audio_url is required');
    }

    console.log('Starting viral moment detection:', { analysis_type, video_url: !!video_url, audio_url: !!audio_url });

    // Mock AI analysis results for demo - in real implementation would use AI models
    const results: {
      viral_moments?: ViralMoment[];
      wow_moments?: ViralMoment[];
      chapters?: ChapterSegment[];
      analysis_summary?: any;
    } = {};

    if (analysis_type === 'viral_moments' || analysis_type === 'all') {
      results.viral_moments = await detectViralMoments(video_url, audio_url, options);
    }

    if (analysis_type === 'wow_detector' || analysis_type === 'all') {
      results.wow_moments = await detectWowMoments(video_url, audio_url, options);
    }

    if (analysis_type === 'chapter_split' || analysis_type === 'all') {
      results.chapters = await splitIntoChapters(video_url, audio_url, options);
    }

    // Generate overall analysis summary
    if (analysis_type === 'all') {
      results.analysis_summary = {
        total_viral_moments: (results.viral_moments?.length || 0) + (results.wow_moments?.length || 0),
        avg_viral_score: calculateAverageViralScore(results.viral_moments, results.wow_moments),
        recommended_clips: generateRecommendedClips(results.viral_moments, results.wow_moments, results.chapters),
        optimization_suggestions: generateOptimizationSuggestions(results)
      };
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Viral moment detection error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function detectViralMoments(video_url?: string, audio_url?: string, options: any = {}): Promise<ViralMoment[]> {
  // Mock viral moments detection - would use AI audio/video analysis
  const mockMoments: ViralMoment[] = [
    {
      timestamp: 15.5,
      duration: 2.3,
      confidence: 0.92,
      type: 'laughter',
      description: 'Genuine laughter burst detected',
      suggested_cut: { start: 14.0, end: 18.5, title: 'Funny Moment' },
      viral_score: 8.5
    },
    {
      timestamp: 45.2,
      duration: 1.8,
      confidence: 0.87,
      type: 'hype_word',
      description: 'High-energy exclamation: "INCREDIBLE!"',
      suggested_cut: { start: 43.5, end: 48.0, title: 'Hype Moment' },
      viral_score: 7.8
    },
    {
      timestamp: 72.1,
      duration: 3.2,
      confidence: 0.94,
      type: 'energy_spike',
      description: 'Significant audio energy spike with excitement',
      suggested_cut: { start: 70.0, end: 76.0, title: 'Energy Peak' },
      viral_score: 9.1
    }
  ];

  // Filter based on sensitivity
  const sensitivity = options.sensitivity || 'medium';
  const minConfidence = sensitivity === 'high' ? 0.9 : sensitivity === 'medium' ? 0.8 : 0.7;
  
  return mockMoments.filter(moment => moment.confidence >= minConfidence);
}

async function detectWowMoments(video_url?: string, audio_url?: string, options: any = {}): Promise<ViralMoment[]> {
  // Mock wow moment detection - would analyze reactions, expressions, tone changes
  const mockWowMoments: ViralMoment[] = [
    {
      timestamp: 28.3,
      duration: 4.1,
      confidence: 0.89,
      type: 'wow_reaction',
      description: 'Big reaction: jaw drop + "no way!" exclamation',
      suggested_cut: { start: 26.0, end: 32.5, title: 'Epic Reaction' },
      viral_score: 8.7
    },
    {
      timestamp: 58.7,
      duration: 2.9,
      confidence: 0.91,
      type: 'wow_reaction',  
      description: 'Surprise gasp with wide eyes detected',
      suggested_cut: { start: 56.5, end: 62.0, title: 'Shocking Moment' },
      viral_score: 8.9
    }
  ];

  return mockWowMoments;
}

async function splitIntoChapters(video_url?: string, audio_url?: string, options: any = {}): Promise<ChapterSegment[]> {
  // Mock chapter splitting - would use AI to detect topic changes
  const maxSegments = options.max_segments || 5;
  const minDuration = options.min_segment_duration || 30;
  
  const mockChapters: ChapterSegment[] = [
    {
      start_time: 0,
      end_time: 35.2,
      title: "Introduction & Setup",
      topic: "introduction", 
      summary: "Host introduces the topic and sets up the demonstration",
      key_points: ["Welcome message", "Topic overview", "Setup preparation"],
      viral_potential: 6.2
    },
    {
      start_time: 35.2,
      end_time: 68.5,
      title: "Main Demonstration",
      topic: "demonstration",
      summary: "Core content showcasing the main feature or concept",
      key_points: ["Key feature demo", "User reactions", "Technical explanation"],
      viral_potential: 8.4
    },
    {
      start_time: 68.5,
      end_time: 95.0,
      title: "Results & Reactions", 
      topic: "results",
      summary: "Showing results and capturing genuine reactions",
      key_points: ["Final reveal", "Audience reactions", "Impact discussion"],
      viral_potential: 9.1
    }
  ];

  return mockChapters.slice(0, maxSegments);
}

function calculateAverageViralScore(viral_moments?: ViralMoment[], wow_moments?: ViralMoment[]): number {
  const allMoments = [...(viral_moments || []), ...(wow_moments || [])];
  if (allMoments.length === 0) return 0;
  
  const totalScore = allMoments.reduce((sum, moment) => sum + moment.viral_score, 0);
  return Math.round((totalScore / allMoments.length) * 10) / 10;
}

function generateRecommendedClips(viral_moments?: ViralMoment[], wow_moments?: ViralMoment[], chapters?: ChapterSegment[]) {
  const allMoments = [...(viral_moments || []), ...(wow_moments || [])];
  
  return allMoments
    .sort((a, b) => b.viral_score - a.viral_score)
    .slice(0, 3)
    .map((moment, index) => ({
      rank: index + 1,
      title: moment.suggested_cut.title,
      start: moment.suggested_cut.start,
      end: moment.suggested_cut.end,
      viral_score: moment.viral_score,
      reason: moment.description
    }));
}

function generateOptimizationSuggestions(results: any) {
  return [
    "Focus on high-energy moments (8.5+ viral score) for maximum engagement",
    "Consider splitting long-form content using detected chapter breaks",
    "Lead with your strongest wow moment in the first 3 seconds",
    "Use detected laughter moments as natural transition points",
    "Create teaser clips from top 3 viral moments for promotion"
  ];
}