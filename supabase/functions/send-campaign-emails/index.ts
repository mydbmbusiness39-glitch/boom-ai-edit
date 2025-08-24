import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendCampaignRequest {
  campaignId: string;
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

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { campaignId }: SendCampaignRequest = await req.json();

    console.log('Processing campaign:', campaignId);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get subscribers based on target segment
    let subscribersQuery = supabaseClient
      .from('subscribers')
      .select('*')
      .eq('user_id', campaign.user_id)
      .eq('status', 'active');

    if (campaign.target_segment !== 'all') {
      subscribersQuery = subscribersQuery.eq('fan_segment', campaign.target_segment);
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
      console.log('No subscribers found for campaign');
      await supabaseClient
        .from('email_campaigns')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          total_recipients: 0 
        })
        .eq('id', campaignId);

      return new Response(JSON.stringify({ 
        message: 'Campaign completed - no subscribers found',
        recipients: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Sending to ${subscribers.length} subscribers`);

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (subscriber) => {
        try {
          // Personalize content
          const personalizedContent = campaign.content
            .replace(/\{name\}/g, subscriber.name || 'there')
            .replace(/\{email\}/g, subscriber.email);

          const { error: emailError } = await resend.emails.send({
            from: 'BOOM Creator <onboarding@resend.dev>',
            to: [subscriber.email],
            subject: campaign.subject,
            html: `
              <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">⚡ BOOM!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Video Editor</p>
                </div>
                <div style="padding: 30px; background: white;">
                  <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">
                    ${personalizedContent}
                  </div>
                </div>
                <div style="padding: 20px; background: #f8f9fa; text-align: center; color: #666; font-size: 12px;">
                  <p>You received this because you're subscribed to our updates.</p>
                  <p><a href="#" style="color: #666;">Unsubscribe</a> | <a href="#" style="color: #666;">Manage Preferences</a></p>
                </div>
              </div>
            `
          });

          if (emailError) {
            console.error(`Failed to send to ${subscriber.email}:`, emailError);
            errorCount++;
          } else {
            console.log(`Sent email to ${subscriber.email}`);
            successCount++;
            
            // Track engagement event
            await supabaseClient.from('subscriber_engagement').insert({
              subscriber_id: subscriber.id,
              event_type: 'email_open',
              campaign_id: campaignId,
              event_data: { email_sent: true }
            });
          }
        } catch (error) {
          console.error(`Error processing ${subscriber.email}:`, error);
          errorCount++;
        }
      });

      await Promise.all(emailPromises);
      
      // Small delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await supabaseClient
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: successCount + errorCount
      })
      .eq('id', campaignId);

    console.log(`Campaign completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      message: 'Campaign sent successfully',
      recipients: successCount + errorCount,
      success: successCount,
      errors: errorCount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in send-campaign-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});