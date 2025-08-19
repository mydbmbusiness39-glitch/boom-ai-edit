-- Add tier and job tracking columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS jobs_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_job_date DATE;

-- Update existing handle_new_user function to use 'tier' instead of 'plan'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tier)
  VALUES (new.id, new.email, 'free');
  RETURN new;
END;
$$;

-- Create jobs table to track user usage
CREATE TABLE IF NOT EXISTS public.jobs_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'rendering', 'completed', 'failed', 'cancelled')),
  files JSONB,
  style_id TEXT,
  duration INTEGER,
  progress INTEGER DEFAULT 0,
  preview_url TEXT,
  output_url TEXT,
  watermarked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new jobs table
ALTER TABLE public.jobs_new ENABLE ROW LEVEL SECURITY;

-- Jobs policies for new table
CREATE POLICY "Users can view their own jobs" 
ON public.jobs_new 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.jobs_new 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.jobs_new 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create uploads table for file cleanup
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs_new ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on uploads
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Uploads policies
CREATE POLICY "Users can view their own uploads" 
ON public.uploads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" 
ON public.uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to check daily job limits
CREATE OR REPLACE FUNCTION public.check_job_limit(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier TEXT;
  jobs_today INTEGER;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get user tier and job count
  SELECT tier, 
    CASE 
      WHEN last_job_date = today_date THEN jobs_today 
      ELSE 0 
    END
  INTO user_tier, jobs_today
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Check limits based on tier
  IF user_tier = 'free' AND jobs_today >= 5 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to increment job count
CREATE OR REPLACE FUNCTION public.increment_job_count(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
BEGIN
  UPDATE public.profiles 
  SET 
    jobs_today = CASE 
      WHEN last_job_date = today_date THEN jobs_today + 1 
      ELSE 1 
    END,
    last_job_date = today_date,
    updated_at = now()
  WHERE id = user_uuid;
END;
$$;

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('video-uploads', 'video-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video uploads
CREATE POLICY "Users can view their own uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);