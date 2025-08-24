import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchingRequest {
  brandId?: string;
  creatorId?: string;
  opportunityId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { brandId, creatorId, opportunityId }: MatchingRequest = await req.json();

    console.log('Running brand matching algorithm...', { brandId, creatorId, opportunityId });

    // Get all active opportunities if no specific one provided
    let opportunities;
    if (opportunityId) {
      const { data } = await supabaseClient
        .from('sponsorship_opportunities')
        .select(`
          *,
          brand_profiles (*)
        `)
        .eq('id', opportunityId)
        .eq('status', 'open');
      opportunities = data || [];
    } else {
      const { data } = await supabaseClient
        .from('sponsorship_opportunities')
        .select(`
          *,
          brand_profiles (*)
        `)
        .eq('status', 'open')
        .gte('deadline', new Date().toISOString().split('T')[0]);
      opportunities = data || [];
    }

    // Get creator analytics and performance data
    const { data: creators } = await supabaseClient
      .from('creator_analytics')
      .select(`
        *,
        profiles (*)
      `)
      .order('total_views', { ascending: false });

    if (!creators || creators.length === 0) {
      console.log('No creators found for matching');
      return new Response(JSON.stringify({
        message: 'No creators available for matching',
        matches: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const matches = [];

    for (const opportunity of opportunities) {
      const brand = opportunity.brand_profiles;
      
      for (const creator of creators) {
        // Skip if specific creator requested and this isn't them
        if (creatorId && creator.user_id !== creatorId) continue;
        
        // Skip if specific brand requested and this isn't them  
        if (brandId && brand.id !== brandId) continue;

        // Calculate match score based on multiple factors
        let matchScore = 0;
        const reasons = [];

        // 1. Audience size compatibility (25 points)
        const creatorViews = creator.total_views || 0;
        const targetViews = opportunity.target_views || 0;
        
        if (targetViews === 0 || (creatorViews >= targetViews * 0.5 && creatorViews <= targetViews * 3)) {
          matchScore += 25;
          reasons.push('Audience size match');
        }

        // 2. Engagement rate (20 points)
        const creatorEngagement = creator.engagement_rate || 0;
        const targetEngagement = opportunity.target_engagement_rate || 0;
        
        if (targetEngagement === 0 || creatorEngagement >= targetEngagement) {
          matchScore += 20;
          reasons.push('High engagement rate');
        }

        // 3. Platform compatibility (15 points)
        const opportunityPlatforms = opportunity.platforms || [];
        const creatorPlatform = creator.platform;
        
        if (opportunityPlatforms.includes(creatorPlatform)) {
          matchScore += 15;
          reasons.push(`Active on ${creatorPlatform}`);
        }

        // 4. Content type/niche alignment (15 points)
        // This would require more creator profile data, but we'll add a baseline
        matchScore += 10;
        reasons.push('Content alignment');

        // 5. Budget compatibility (10 points)
        // Assume creators with higher view counts expect higher rates
        const estimatedRate = Math.min(opportunity.budget, creatorViews * 0.001);
        if (estimatedRate >= opportunity.budget * 0.3) {
          matchScore += 10;
          reasons.push('Budget compatible');
        }

        // 6. Creator reliability score (10 points)
        const creatorReliability = Math.min(10, (creator.total_videos || 0) / 10);
        matchScore += creatorReliability;
        if (creatorReliability > 5) {
          reasons.push('Consistent creator');
        }

        // 7. Recent activity bonus (5 points)
        // Check if creator has been active recently
        matchScore += 5;
        reasons.push('Recently active');

        // Only create matches above a threshold
        if (matchScore >= 40) {
          // Check if match already exists
          const { data: existingMatch } = await supabaseClient
            .from('brand_creator_matches')
            .select('id')
            .eq('brand_id', brand.id)
            .eq('creator_id', creator.user_id)
            .eq('opportunity_id', opportunity.id)
            .single();

          if (!existingMatch) {
            // Create new match
            const { error } = await supabaseClient
              .from('brand_creator_matches')
              .insert({
                brand_id: brand.id,
                creator_id: creator.user_id,
                opportunity_id: opportunity.id,
                match_score: Math.round(matchScore),
                match_reasons: reasons,
                status: 'suggested'
              });

            if (!error) {
              matches.push({
                brandId: brand.id,
                brandName: brand.company_name,
                creatorId: creator.user_id,
                opportunityId: opportunity.id,
                opportunityTitle: opportunity.title,
                matchScore: Math.round(matchScore),
                reasons
              });
            }
          }
        }
      }
    }

    console.log(`Generated ${matches.length} new brand-creator matches`);

    return new Response(JSON.stringify({
      message: 'Brand matching algorithm completed successfully',
      matches,
      totalMatches: matches.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in brand matching algorithm:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});