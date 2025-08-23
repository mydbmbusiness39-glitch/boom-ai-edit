-- Create affiliate links table
CREATE TABLE public.affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  platform TEXT NOT NULL, -- 'shopify', 'amazon', 'kofi', 'patreon', 'custom'
  link_type TEXT NOT NULL DEFAULT 'product', -- 'product', 'donation', 'subscription', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  product_id TEXT, -- External platform product ID
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  revenue_total DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  auto_sync_enabled BOOLEAN DEFAULT false,
  platform_data JSONB DEFAULT '{}', -- Store platform-specific data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own affiliate links" 
ON public.affiliate_links 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own affiliate links" 
ON public.affiliate_links 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate links" 
ON public.affiliate_links 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own affiliate links" 
ON public.affiliate_links 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create shoppable overlays table
CREATE TABLE public.shoppable_overlays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  affiliate_link_ids UUID[] DEFAULT '{}', -- Array of affiliate link IDs
  overlay_style JSONB DEFAULT '{
    "position": "bottom-right",
    "size": "medium",
    "theme": "modern",
    "animation": "fade",
    "showPrice": true,
    "showDescription": true
  }',
  trigger_settings JSONB DEFAULT '{
    "showOnStart": false,
    "showOnEnd": true,
    "showOnKeywords": [],
    "showDuration": 5000
  }',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shoppable_overlays ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own shoppable overlays" 
ON public.shoppable_overlays 
FOR ALL 
USING (auth.uid() = user_id);

-- Create affiliate analytics table
CREATE TABLE public.affiliate_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  affiliate_link_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'click', 'conversion', 'revenue'
  video_id UUID, -- Optional: which video generated the event
  platform TEXT NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0, -- Revenue amount for conversions
  commission DECIMAL(10,2) DEFAULT 0, -- Commission earned
  visitor_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  country_code TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  event_metadata JSONB DEFAULT '{}', -- Additional tracking data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own affiliate analytics" 
ON public.affiliate_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create affiliate analytics" 
ON public.affiliate_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create platform sync configs table
CREATE TABLE public.platform_sync_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  platform TEXT NOT NULL, -- 'shopify', 'amazon', 'kofi', 'patreon'
  is_enabled BOOLEAN DEFAULT false,
  api_credentials JSONB DEFAULT '{}', -- Encrypted API keys/tokens
  sync_settings JSONB DEFAULT '{
    "autoSync": true,
    "syncInterval": 3600,
    "syncProducts": true,
    "syncAnalytics": true
  }',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_sync_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own platform sync configs" 
ON public.platform_sync_configs 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_affiliate_links_user_id ON public.affiliate_links(user_id);
CREATE INDEX idx_affiliate_links_platform ON public.affiliate_links(platform);
CREATE INDEX idx_affiliate_analytics_user_id ON public.affiliate_analytics(user_id);
CREATE INDEX idx_affiliate_analytics_link_id ON public.affiliate_analytics(affiliate_link_id);
CREATE INDEX idx_affiliate_analytics_created_at ON public.affiliate_analytics(created_at);
CREATE INDEX idx_shoppable_overlays_user_id ON public.shoppable_overlays(user_id);
CREATE INDEX idx_platform_sync_configs_user_id ON public.platform_sync_configs(user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_affiliate_links_updated_at
BEFORE UPDATE ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shoppable_overlays_updated_at
BEFORE UPDATE ON public.shoppable_overlays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_sync_configs_updated_at
BEFORE UPDATE ON public.platform_sync_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment affiliate link stats
CREATE OR REPLACE FUNCTION public.increment_affiliate_stats(
  link_id UUID,
  stat_type TEXT,
  amount DECIMAL DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF stat_type = 'click' THEN
    UPDATE affiliate_links 
    SET click_count = click_count + 1, updated_at = now()
    WHERE id = link_id;
  ELSIF stat_type = 'conversion' THEN
    UPDATE affiliate_links 
    SET conversion_count = conversion_count + 1, 
        revenue_total = revenue_total + amount,
        updated_at = now()
    WHERE id = link_id;
  END IF;
END;
$$;