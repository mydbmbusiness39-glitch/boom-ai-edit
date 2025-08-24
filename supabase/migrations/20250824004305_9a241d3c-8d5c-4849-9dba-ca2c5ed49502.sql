-- Create AI twin collaboration and marketplace enhancements

-- Add collaboration settings to ai_avatars
ALTER TABLE ai_avatars ADD COLUMN IF NOT EXISTS is_available_for_rent BOOLEAN DEFAULT false;
ALTER TABLE ai_avatars ADD COLUMN IF NOT EXISTS rental_price_per_hour NUMERIC DEFAULT 0;
ALTER TABLE ai_avatars ADD COLUMN IF NOT EXISTS rental_price_per_video NUMERIC DEFAULT 0;
ALTER TABLE ai_avatars ADD COLUMN IF NOT EXISTS collaboration_settings JSONB DEFAULT '{"allowCommercialUse": true, "maxRentalDuration": 24, "requireApproval": false}'::jsonb;
ALTER TABLE ai_avatars ADD COLUMN IF NOT EXISTS earnings_total NUMERIC DEFAULT 0;

-- Create AI twin rentals table
CREATE TABLE IF NOT EXISTS ai_twin_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID NOT NULL REFERENCES auth.users(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  avatar_id UUID NOT NULL REFERENCES ai_avatars(id),
  rental_type TEXT NOT NULL DEFAULT 'per_video', -- 'per_hour' or 'per_video'
  duration_hours INTEGER,
  price_paid NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0.15, -- 15% platform fee
  owner_earnings NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  rental_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rental_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled')),
  video_project_id UUID,
  collaboration_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on ai_twin_rentals
ALTER TABLE ai_twin_rentals ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_twin_rentals
CREATE POLICY "Users can create rentals" ON ai_twin_rentals
  FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Users can view their rentals" ON ai_twin_rentals
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Avatar owners can manage rentals" ON ai_twin_rentals
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = renter_id);

-- Add marketplace item types for new content
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS revenue_share_rate NUMERIC DEFAULT 0;
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'standard' CHECK (license_type IN ('standard', 'commercial', 'exclusive'));

-- Create caption packs table
CREATE TABLE IF NOT EXISTS caption_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  niche TEXT,
  caption_count INTEGER DEFAULT 0,
  captions JSONB DEFAULT '[]'::jsonb,
  price NUMERIC DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  revenue_total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on caption_packs
ALTER TABLE caption_packs ENABLE ROW LEVEL SECURITY;

-- RLS policies for caption_packs
CREATE POLICY "Anyone can view approved caption packs" ON caption_packs
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can create their own caption packs" ON caption_packs
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can manage their own caption packs" ON caption_packs
  FOR ALL USING (auth.uid() = creator_id);

-- Create collaboration projects table
CREATE TABLE IF NOT EXISTS collaboration_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT DEFAULT 'video' CHECK (project_type IN ('video', 'template', 'series')),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  collaborator_ids JSONB DEFAULT '[]'::jsonb,
  ai_avatars_used JSONB DEFAULT '[]'::jsonb,
  budget_total NUMERIC DEFAULT 0,
  revenue_split JSONB DEFAULT '{}'::jsonb,
  deadline DATE,
  project_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on collaboration_projects
ALTER TABLE collaboration_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for collaboration_projects
CREATE POLICY "Users can create collaboration projects" ON collaboration_projects
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view projects they're part of" ON collaboration_projects
  FOR SELECT USING (
    auth.uid() = creator_id OR 
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(collaborator_ids))
  );

CREATE POLICY "Project creators can manage projects" ON collaboration_projects
  FOR ALL USING (auth.uid() = creator_id);

-- Create revenue sharing table
CREATE TABLE IF NOT EXISTS revenue_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('ai_twin_rental', 'marketplace_sale', 'collaboration_project')),
  source_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  share_percentage NUMERIC NOT NULL DEFAULT 0,
  transaction_type TEXT DEFAULT 'earning' CHECK (transaction_type IN ('earning', 'fee', 'commission')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on revenue_shares
ALTER TABLE revenue_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for revenue_shares
CREATE POLICY "Users can view their own revenue shares" ON revenue_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create revenue shares" ON revenue_shares
  FOR INSERT WITH CHECK (true);

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_twin_rentals_updated_at
  BEFORE UPDATE ON ai_twin_rentals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caption_packs_updated_at
  BEFORE UPDATE ON caption_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_projects_updated_at
  BEFORE UPDATE ON collaboration_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();