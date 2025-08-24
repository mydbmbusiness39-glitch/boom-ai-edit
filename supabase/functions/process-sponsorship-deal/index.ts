import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessDealRequest {
  applicationId: string;
  action: 'approve' | 'reject';
  dealAmount?: number;
  deadline?: string;
  contractTerms?: string;
  brandNotes?: string;
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

    const { applicationId, action, dealAmount, deadline, contractTerms, brandNotes }: ProcessDealRequest = await req.json();

    console.log('Processing sponsorship deal:', { applicationId, action });

    // Get application details
    const { data: application, error: appError } = await supabaseClient
      .from('sponsorship_applications')
      .select(`
        *,
        sponsorship_opportunities (
          *,
          brand_profiles (*)
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Application not found:', appError);
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'approve') {
      if (!dealAmount || !deadline) {
        return new Response(JSON.stringify({ error: 'Deal amount and deadline are required for approval' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create sponsorship deal
      const { data: deal, error: dealError } = await supabaseClient
        .from('sponsorship_deals')
        .insert({
          opportunity_id: application.opportunity_id,
          brand_id: application.sponsorship_opportunities.brand_id,
          creator_id: application.creator_id,
          deal_amount: dealAmount,
          platform_fee_rate: 0.15, // 15% platform fee
          deadline: deadline,
          contract_terms: contractTerms || null,
          status: 'active'
        })
        .select()
        .single();

      if (dealError) {
        console.error('Error creating deal:', dealError);
        return new Response(JSON.stringify({ error: 'Failed to create deal' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update application status
      await supabaseClient
        .from('sponsorship_applications')
        .update({
          status: 'approved',
          brand_notes: brandNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      // Update opportunity status if max creators reached
      const { data: approvedApplications } = await supabaseClient
        .from('sponsorship_applications')
        .select('id')
        .eq('opportunity_id', application.opportunity_id)
        .eq('status', 'approved');

      const opportunity = application.sponsorship_opportunities;
      if (approvedApplications && approvedApplications.length >= opportunity.max_creators) {
        await supabaseClient
          .from('sponsorship_opportunities')
          .update({ status: 'in_progress' })
          .eq('id', application.opportunity_id);
      }

      console.log('Deal created successfully:', deal.id);

      return new Response(JSON.stringify({
        message: 'Deal approved and created successfully',
        dealId: deal.id,
        creatorPayout: deal.creator_payout,
        platformFee: deal.platform_fee
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'reject') {
      // Update application status
      const { error: updateError } = await supabaseClient
        .from('sponsorship_applications')
        .update({
          status: 'rejected',
          brand_notes: brandNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) {
        console.error('Error updating application:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to reject application' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Application rejected successfully');

      return new Response(JSON.stringify({
        message: 'Application rejected successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in process-sponsorship-deal function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});