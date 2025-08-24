-- Create brand profiles table
CREATE TABLE public.brand_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_description text,
  website_url text,
  logo_url text,
  industry text NOT NULL,
  target_demographics jsonb DEFAULT '{}'::jsonb,
  budget_range text DEFAULT 'negotiable',
  budget_min numeric DEFAULT 0,
  budget_max numeric DEFAULT 0,
  preferred_platforms jsonb DEFAULT '["tiktok", "youtube", "instagram"]'::jsonb,
  content_requirements jsonb DEFAULT '{}'::jsonb,
  brand_guidelines_url text,
  contact_email text,
  contact_person text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_active boolean DEFAULT true,
  total_spent numeric DEFAULT 0,
  deals_completed integer DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sponsorship opportunities table
CREATE TABLE public.sponsorship_opportunities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  campaign_type text DEFAULT 'sponsored_post' CHECK (campaign_type IN ('sponsored_post', 'product_placement', 'brand_mention', 'full_campaign', 'affiliate')),
  budget numeric NOT NULL,
  target_views integer DEFAULT 0,
  target_engagement_rate numeric DEFAULT 0,
  content_requirements jsonb DEFAULT '{}'::jsonb,
  deliverables jsonb DEFAULT '[]'::jsonb,
  deadline date,
  preferred_demographics jsonb DEFAULT '{}'::jsonb,
  platforms jsonb DEFAULT '["tiktok"]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  applications_count integer DEFAULT 0,
  max_creators integer DEFAULT 1,
  auto_approve boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sponsorship applications table
CREATE TABLE public.sponsorship_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES public.sponsorship_opportunities(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pitch_message text NOT NULL,
  proposed_rate numeric,
  portfolio_links jsonb DEFAULT '[]'::jsonb,
  relevant_clips jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  brand_notes text,
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  UNIQUE(opportunity_id, creator_id)
);

-- Create sponsorship deals table
CREATE TABLE public.sponsorship_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES public.sponsorship_opportunities(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_amount numeric NOT NULL,
  platform_fee_rate numeric DEFAULT 0.15,
  platform_fee numeric NOT NULL DEFAULT 0,
  creator_payout numeric NOT NULL DEFAULT 0,
  deliverables jsonb DEFAULT '[]'::jsonb,
  deadline date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'disputed', 'cancelled')),
  contract_terms text,
  content_submitted_urls jsonb DEFAULT '[]'::jsonb,
  brand_approval_status text DEFAULT 'pending' CHECK (brand_approval_status IN ('pending', 'approved', 'needs_revision', 'rejected')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
  completion_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create brand creator matches table (algorithmic matching)
CREATE TABLE public.brand_creator_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.sponsorship_opportunities(id) ON DELETE CASCADE,
  match_score numeric NOT NULL DEFAULT 0,
  match_reasons jsonb DEFAULT '[]'::jsonb,
  trending_clip_id uuid REFERENCES public.clip_performances(id) ON DELETE SET NULL,
  status text DEFAULT 'suggested' CHECK (status IN ('suggested', 'viewed', 'contacted', 'ignored')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(brand_id, creator_id, opportunity_id)
);

-- Create sponsorship payments table
CREATE TABLE public.sponsorship_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.sponsorship_deals(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('deal_payment', 'platform_fee', 'bonus')),
  amount numeric NOT NULL,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_method text DEFAULT 'stripe',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  stripe_payment_id text,
  transaction_fee numeric DEFAULT 0,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create brand reviews table
CREATE TABLE public.brand_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.sponsorship_deals(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_type text NOT NULL CHECK (reviewer_type IN ('creator', 'brand')),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  payment_timeliness_rating integer CHECK (payment_timeliness_rating >= 1 AND payment_timeliness_rating <= 5),
  content_quality_rating integer CHECK (content_quality_rating >= 1 AND content_quality_rating <= 5),
  is_public boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_creator_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_profiles
CREATE POLICY "Users can manage their own brand profile" 
ON public.brand_profiles FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified brand profiles" 
ON public.brand_profiles FOR SELECT 
USING (verification_status = 'verified' AND is_active = true);

-- RLS Policies for sponsorship_opportunities
CREATE POLICY "Brands can manage their own opportunities" 
ON public.sponsorship_opportunities FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.brand_profiles 
  WHERE id = sponsorship_opportunities.brand_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Anyone can view open opportunities" 
ON public.sponsorship_opportunities FOR SELECT 
USING (status = 'open');

-- RLS Policies for sponsorship_applications
CREATE POLICY "Creators can manage their own applications" 
ON public.sponsorship_applications FOR ALL 
USING (auth.uid() = creator_id);

CREATE POLICY "Brands can view applications for their opportunities" 
ON public.sponsorship_applications FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.sponsorship_opportunities so
  JOIN public.brand_profiles bp ON bp.id = so.brand_id
  WHERE so.id = sponsorship_applications.opportunity_id 
  AND bp.user_id = auth.uid()
));

-- RLS Policies for sponsorship_deals
CREATE POLICY "Participants can view their own deals" 
ON public.sponsorship_deals FOR SELECT 
USING (
  auth.uid() = creator_id OR 
  EXISTS (
    SELECT 1 FROM public.brand_profiles 
    WHERE id = sponsorship_deals.brand_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Brands and creators can update their deals" 
ON public.sponsorship_deals FOR UPDATE 
USING (
  auth.uid() = creator_id OR 
  EXISTS (
    SELECT 1 FROM public.brand_profiles 
    WHERE id = sponsorship_deals.brand_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for brand_creator_matches
CREATE POLICY "Users can view their own matches" 
ON public.brand_creator_matches FOR SELECT 
USING (
  auth.uid() = creator_id OR 
  EXISTS (
    SELECT 1 FROM public.brand_profiles 
    WHERE id = brand_creator_matches.brand_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for sponsorship_payments
CREATE POLICY "Users can view their own payments" 
ON public.sponsorship_payments FOR SELECT 
USING (auth.uid() = recipient_id OR auth.uid() = payer_id);

-- RLS Policies for brand_reviews
CREATE POLICY "Anyone can view public reviews" 
ON public.brand_reviews FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can create reviews for their deals" 
ON public.brand_reviews FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);

-- Create updated_at triggers
CREATE TRIGGER update_brand_profiles_updated_at
  BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsorship_opportunities_updated_at
  BEFORE UPDATE ON public.sponsorship_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sponsorship_deals_updated_at
  BEFORE UPDATE ON public.sponsorship_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_creator_matches_updated_at
  BEFORE UPDATE ON public.brand_creator_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate deal payouts
CREATE OR REPLACE FUNCTION public.calculate_deal_payout()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate platform fee and creator payout
  NEW.platform_fee = NEW.deal_amount * NEW.platform_fee_rate;
  NEW.creator_payout = NEW.deal_amount - NEW.platform_fee;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for deal payout calculation
CREATE TRIGGER calculate_sponsorship_deal_payout
  BEFORE INSERT OR UPDATE ON public.sponsorship_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_deal_payout();

-- Create function to update brand stats
CREATE OR REPLACE FUNCTION public.update_brand_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.brand_profiles 
    SET 
      deals_completed = deals_completed + 1,
      total_spent = total_spent + NEW.deal_amount,
      updated_at = now()
    WHERE id = NEW.brand_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for brand stats updates
CREATE TRIGGER update_brand_stats_trigger
  AFTER UPDATE ON public.sponsorship_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_brand_stats();