-- Create analytics and performance tracking tables
CREATE TABLE public.clip_performances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs_new(id) ON DELETE CASCADE,
  clip_title TEXT,
  clip_url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube_shorts', 'instagram_reels', 'twitter', 'linkedin')),
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Performance metrics
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  click_through_rate DECIMAL(5,2) DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  
  -- AI predictions and scores
  viral_prediction_score DECIMAL(5,2) DEFAULT 0,
  predicted_max_views INTEGER DEFAULT 0,
  confidence_level DECIMAL(3,2) DEFAULT 0,
  
  -- Tracking metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator analytics table for growth tracking
CREATE TABLE public.creator_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube_shorts', 'instagram_reels', 'twitter', 'linkedin', 'all')),
  
  -- Growth metrics
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  
  -- Time-based metrics
  avg_watch_time DECIMAL(8,2) DEFAULT 0,
  total_watch_time_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Revenue tracking
  estimated_revenue DECIMAL(10,2) DEFAULT 0,
  ad_revenue DECIMAL(10,2) DEFAULT 0,
  sponsored_content_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Engagement metrics
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  viral_clips_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one record per user/date/platform combination
  UNIQUE(user_id, date, platform)
);

-- Create viral insights table for AI predictions and analysis
CREATE TABLE public.viral_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clip_id UUID REFERENCES public.clip_performances(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs_new(id) ON DELETE CASCADE,
  
  -- AI Analysis results
  viral_factors JSONB DEFAULT '{}',
  improvement_suggestions JSONB DEFAULT '[]',
  trending_elements JSONB DEFAULT '[]',
  optimal_posting_times JSONB DEFAULT '[]',
  target_audience JSONB DEFAULT '{}',
  
  -- Prediction accuracy tracking
  predicted_viral BOOLEAN DEFAULT false,
  actual_viral BOOLEAN DEFAULT false,
  prediction_accuracy DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance snapshots for historical tracking
CREATE TABLE public.performance_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_performance_id UUID NOT NULL REFERENCES public.clip_performances(id) ON DELETE CASCADE,
  
  -- Snapshot data
  views_delta INTEGER DEFAULT 0,
  likes_delta INTEGER DEFAULT 0,
  shares_delta INTEGER DEFAULT 0,
  comments_delta INTEGER DEFAULT 0,
  
  -- Time period
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_since_post INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clip_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viral_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clip_performances
CREATE POLICY "Users can view their own clip performances" 
ON public.clip_performances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clip performances" 
ON public.clip_performances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clip performances" 
ON public.clip_performances 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clip performances" 
ON public.clip_performances 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for creator_analytics
CREATE POLICY "Users can view their own analytics" 
ON public.creator_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics" 
ON public.creator_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" 
ON public.creator_analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for viral_insights
CREATE POLICY "Users can view their own viral insights" 
ON public.viral_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own viral insights" 
ON public.viral_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own viral insights" 
ON public.viral_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for performance_snapshots
CREATE POLICY "Users can view performance snapshots for their clips" 
ON public.performance_snapshots 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.clip_performances 
  WHERE clip_performances.id = performance_snapshots.clip_performance_id 
  AND clip_performances.user_id = auth.uid()
));

CREATE POLICY "Users can create performance snapshots for their clips" 
ON public.performance_snapshots 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clip_performances 
  WHERE clip_performances.id = performance_snapshots.clip_performance_id 
  AND clip_performances.user_id = auth.uid()
));

-- Add triggers for updated_at columns
CREATE TRIGGER update_clip_performances_updated_at
BEFORE UPDATE ON public.clip_performances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_analytics_updated_at
BEFORE UPDATE ON public.creator_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_viral_insights_updated_at
BEFORE UPDATE ON public.viral_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_clip_performances_user_id ON public.clip_performances(user_id);
CREATE INDEX idx_clip_performances_platform ON public.clip_performances(platform);
CREATE INDEX idx_clip_performances_posted_at ON public.clip_performances(posted_at);
CREATE INDEX idx_clip_performances_viral_score ON public.clip_performances(viral_prediction_score DESC);

CREATE INDEX idx_creator_analytics_user_id ON public.creator_analytics(user_id);
CREATE INDEX idx_creator_analytics_date ON public.creator_analytics(date DESC);
CREATE INDEX idx_creator_analytics_platform ON public.creator_analytics(platform);

CREATE INDEX idx_viral_insights_user_id ON public.viral_insights(user_id);
CREATE INDEX idx_viral_insights_clip_id ON public.viral_insights(clip_id);

CREATE INDEX idx_performance_snapshots_clip_id ON public.performance_snapshots(clip_performance_id);
CREATE INDEX idx_performance_snapshots_date ON public.performance_snapshots(snapshot_date DESC);