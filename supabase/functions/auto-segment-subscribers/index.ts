import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SegmentSubscribersRequest {
  userId?: string; // Optional - if not provided, segments all users
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

    const { userId }: SegmentSubscribersRequest = await req.json();

    console.log('Auto-segmenting subscribers for user:', userId || 'all users');

    // Get subscribers to segment
    let subscribersQuery = supabaseClient
      .from('subscribers')
      .select('*');

    if (userId) {
      subscribersQuery = subscribersQuery.eq('user_id', userId);
    }

    const { data: subscribers, error: subscribersError } = await subscribersQuery;

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch subscribers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No subscribers found to segment',
        segmented: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${subscribers.length} subscribers for auto-segmentation`);

    let segmentedCount = 0;

    // Process each subscriber
    for (const subscriber of subscribers) {
      try {
        // Get engagement data for this subscriber
        const { data: engagementData, error: engagementError } = await supabaseClient
          .from('subscriber_engagement')
          .select('*')
          .eq('subscriber_id', subscriber.id);

        if (engagementError) {
          console.error(`Error fetching engagement for ${subscriber.email}:`, engagementError);
          continue;
        }

        // Calculate engagement metrics
        const totalEvents = engagementData?.length || 0;
        const purchases = engagementData?.filter(e => e.event_type === 'purchase').length || 0;
        const recentEvents = engagementData?.filter(e => 
          new Date(e.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length || 0;
        const emailOpens = engagementData?.filter(e => e.event_type === 'email_open').length || 0;
        const emailClicks = engagementData?.filter(e => e.event_type === 'email_click').length || 0;
        const videoViews = engagementData?.filter(e => e.event_type === 'video_view').length || 0;

        // Calculate engagement score (0-100)
        const engagementScore = Math.min(100, Math.max(0,
          (totalEvents * 2) + 
          (purchases * 20) + 
          (recentEvents * 5) +
          (emailOpens * 3) +
          (emailClicks * 5) +
          (videoViews * 4)
        ));

        // Determine fan segment based on engagement patterns
        let fanSegment = 'casual';
        
        if (purchases > 0 && recentEvents >= 5) {
          fanSegment = 'superfan';
        } else if (recentEvents >= 3 && engagementScore >= 50) {
          fanSegment = 'engaged';
        } else if (totalEvents > 0 && engagementScore >= 20) {
          fanSegment = 'casual';
        } else if (totalEvents === 0 || engagementScore < 10) {
          fanSegment = 'at_risk';
        }

        // Calculate total purchase value (if available)
        const totalPurchaseValue = engagementData?.reduce((sum, event) => {
          if (event.event_type === 'purchase' && event.event_data?.amount) {
            return sum + (event.event_data.amount as number);
          }
          return sum;
        }, 0) || 0;

        // Update subscriber with new segmentation data
        const { error: updateError } = await supabaseClient
          .from('subscribers')
          .update({
            engagement_score: engagementScore,
            fan_segment: fanSegment,
            total_opens: emailOpens,
            total_clicks: emailClicks,
            purchase_value: totalPurchaseValue,
            last_engagement: engagementData && engagementData.length > 0 
              ? engagementData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
              : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriber.id);

        if (updateError) {
          console.error(`Error updating subscriber ${subscriber.email}:`, updateError);
        } else {
          segmentedCount++;
          console.log(`Updated ${subscriber.email}: ${fanSegment} (${engagementScore} score)`);
        }

      } catch (error) {
        console.error(`Error processing subscriber ${subscriber.email}:`, error);
      }
    }

    // Update email list subscriber counts
    const { data: emailLists } = await supabaseClient
      .from('email_lists')
      .select('id, user_id');

    if (emailLists) {
      for (const list of emailLists) {
        const { count } = await supabaseClient
          .from('email_list_subscribers')
          .select('*', { count: 'exact' })
          .eq('list_id', list.id);

        await supabaseClient
          .from('email_lists')
          .update({ subscriber_count: count || 0 })
          .eq('id', list.id);
      }
    }

    console.log(`Auto-segmentation completed. Processed ${segmentedCount}/${subscribers.length} subscribers`);

    return new Response(JSON.stringify({
      message: 'Auto-segmentation completed successfully',
      totalSubscribers: subscribers.length,
      segmented: segmentedCount,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in auto-segment-subscribers function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});