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
    const { action } = await req.json();
    
    if (action === 'getTrends') {
      // Mock trending data - in production, this would fetch from TikTok API, YouTube API, etc.
      const trendingAudio = [
        {
          id: '1',
          title: 'Viral Dance Beat 2024',
          artist: 'TrendMaker',
          duration: 15,
          trendScore: 95,
          category: 'Dance',
          previewUrl: '/audio/trend1.mp3'
        },
        {
          id: '2',
          title: 'Comedy Sound Effect',
          artist: 'FunnyVibes',
          duration: 8,
          trendScore: 89,
          category: 'Comedy',
          previewUrl: '/audio/trend2.mp3'
        },
        {
          id: '3',
          title: 'Motivational Anthem',
          artist: 'InspireNow',
          duration: 20,
          trendScore: 87,
          category: 'Motivation',
          previewUrl: '/audio/trend3.mp3'
        },
        {
          id: '4',
          title: 'Aesthetic Vibes',
          artist: 'ChillWave',
          duration: 25,
          trendScore: 85,
          category: 'Aesthetic',
          previewUrl: '/audio/trend4.mp3'
        },
        {
          id: '5',
          title: 'Gaming Hype Music',
          artist: 'PixelBeats',
          duration: 18,
          trendScore: 83,
          category: 'Gaming',
          previewUrl: '/audio/trend5.mp3'
        }
      ];

      const trendingHashtags = [
        { tag: '#fyp', count: '2.1B', category: 'General', growth: '+15%' },
        { tag: '#viral', count: '891M', category: 'General', growth: '+23%' },
        { tag: '#trending', count: '567M', category: 'General', growth: '+8%' },
        { tag: '#aesthetic', count: '445M', category: 'Lifestyle', growth: '+31%' },
        { tag: '#dancechallenge', count: '234M', category: 'Dance', growth: '+19%' },
        { tag: '#comedy', count: '178M', category: 'Entertainment', growth: '+12%' },
        { tag: '#motivation', count: '156M', category: 'Inspiration', growth: '+27%' },
        { tag: '#gamertok', count: '134M', category: 'Gaming', growth: '+41%' },
        { tag: '#foodtok', count: '123M', category: 'Food', growth: '+16%' },
        { tag: '#diy', count: '98M', category: 'Lifestyle', growth: '+22%' }
      ];

      return new Response(JSON.stringify({
        audio: trendingAudio,
        hashtags: trendingHashtags,
        lastUpdated: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Invalid action' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trend-detector:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});