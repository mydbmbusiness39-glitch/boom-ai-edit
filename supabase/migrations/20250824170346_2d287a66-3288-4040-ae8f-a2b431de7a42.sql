-- Create subscribers table
CREATE TABLE public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  source text DEFAULT 'manual', -- manual, youtube, tiktok, instagram
  subscription_date timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  tags jsonb DEFAULT '[]'::jsonb,
  engagement_score integer DEFAULT 0,
  fan_segment text DEFAULT 'casual' CHECK (fan_segment IN ('superfan', 'engaged', 'casual', 'at_risk')),
  last_engagement timestamp with time zone,
  total_opens integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  purchase_value numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email lists table
CREATE TABLE public.email_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  subscriber_count integer DEFAULT 0,
  tags jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email list subscribers junction table
CREATE TABLE public.email_list_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(list_id, subscriber_id)
);

-- Create DMs table
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'video', 'image', 'link')),
  media_url text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  platform text DEFAULT 'boom' CHECK (platform IN ('boom', 'email', 'sms')),
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

-- Create email campaigns table
CREATE TABLE public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  template_id text,
  target_segment text CHECK (target_segment IN ('all', 'superfans', 'engaged', 'casual', 'at_risk')),
  list_ids jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  total_recipients integer DEFAULT 0,
  total_opens integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create engagement events table
CREATE TABLE public.subscriber_engagement (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('email_open', 'email_click', 'video_view', 'purchase', 'dm_read', 'dm_reply')),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  dm_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_engagement ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscribers
CREATE POLICY "Users can manage their own subscribers" 
ON public.subscribers FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for email lists
CREATE POLICY "Users can manage their own email lists" 
ON public.email_lists FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for email list subscribers
CREATE POLICY "Users can manage their own list subscriptions" 
ON public.email_list_subscribers FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.email_lists 
  WHERE id = email_list_subscribers.list_id 
  AND user_id = auth.uid()
));

-- Create RLS policies for direct messages
CREATE POLICY "Users can manage their own DMs" 
ON public.direct_messages FOR ALL 
USING (auth.uid() = sender_id);

-- Create RLS policies for email campaigns
CREATE POLICY "Users can manage their own campaigns" 
ON public.email_campaigns FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for engagement
CREATE POLICY "Users can view engagement for their subscribers" 
ON public.subscriber_engagement FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.subscribers 
  WHERE id = subscriber_engagement.subscriber_id 
  AND user_id = auth.uid()
));

CREATE POLICY "System can create engagement events" 
ON public.subscriber_engagement FOR INSERT 
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_lists_updated_at
  BEFORE UPDATE ON public.email_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-update subscriber segments
CREATE OR REPLACE FUNCTION public.update_subscriber_segment()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate engagement score based on recent activity
  WITH engagement_stats AS (
    SELECT 
      COUNT(*) as total_events,
      COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchases,
      COUNT(CASE WHEN created_at >= now() - interval '30 days' THEN 1 END) as recent_events
    FROM public.subscriber_engagement 
    WHERE subscriber_id = NEW.id
  )
  UPDATE public.subscribers 
  SET 
    engagement_score = GREATEST(0, LEAST(100, 
      (engagement_stats.total_events * 2) + 
      (engagement_stats.purchases * 20) + 
      (engagement_stats.recent_events * 5)
    )),
    fan_segment = CASE 
      WHEN engagement_stats.purchases > 0 AND engagement_stats.recent_events >= 5 THEN 'superfan'
      WHEN engagement_stats.recent_events >= 3 THEN 'engaged' 
      WHEN engagement_stats.total_events > 0 THEN 'casual'
      ELSE 'at_risk'
    END,
    updated_at = now()
  FROM engagement_stats
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update segments when engagement changes
CREATE TRIGGER auto_update_subscriber_segment
  AFTER INSERT ON public.subscriber_engagement
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriber_segment();