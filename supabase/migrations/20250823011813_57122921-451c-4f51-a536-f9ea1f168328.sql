-- Create brand_templates table for storing user brand configurations
CREATE TABLE public.brand_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  watermark_position TEXT DEFAULT 'bottom-right',
  brand_colors JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#10B981", "accent": "#F59E0B"}',
  fonts JSONB DEFAULT '{"heading": "Inter", "body": "Inter", "caption": "Inter"}',
  intro_template JSONB,
  outro_template JSONB,
  overlay_settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace_items table for creator marketplace
CREATE TABLE public.marketplace_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('brand_template', 'overlay_pack', 'caption_pack', 'intro_pack', 'outro_pack')),
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  thumbnail_url TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',
  content JSONB NOT NULL,
  downloads_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchases table for marketplace transactions
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  price_paid DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Brand templates policies
CREATE POLICY "Users can view their own brand templates" 
ON public.brand_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public brand templates" 
ON public.brand_templates 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can create their own brand templates" 
ON public.brand_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand templates" 
ON public.brand_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand templates" 
ON public.brand_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Marketplace items policies
CREATE POLICY "Anyone can view approved marketplace items" 
ON public.marketplace_items 
FOR SELECT 
USING (status = 'approved');

CREATE POLICY "Users can view their own marketplace items" 
ON public.marketplace_items 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can create their own marketplace items" 
ON public.marketplace_items 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own marketplace items" 
ON public.marketplace_items 
FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own marketplace items" 
ON public.marketplace_items 
FOR DELETE 
USING (auth.uid() = creator_id);

-- Purchases policies
CREATE POLICY "Users can view their own purchases" 
ON public.purchases 
FOR SELECT 
USING (auth.uid() = buyer_id);

CREATE POLICY "Users can create purchases" 
ON public.purchases 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

-- Add triggers for updated_at
CREATE TRIGGER update_brand_templates_updated_at
BEFORE UPDATE ON public.brand_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_items_updated_at
BEFORE UPDATE ON public.marketplace_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_brand_templates_user_id ON public.brand_templates(user_id);
CREATE INDEX idx_brand_templates_public ON public.brand_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_marketplace_items_creator_id ON public.marketplace_items(creator_id);
CREATE INDEX idx_marketplace_items_type ON public.marketplace_items(type);
CREATE INDEX idx_marketplace_items_status ON public.marketplace_items(status);
CREATE INDEX idx_purchases_buyer_id ON public.purchases(buyer_id);
CREATE INDEX idx_purchases_item_id ON public.purchases(item_id);