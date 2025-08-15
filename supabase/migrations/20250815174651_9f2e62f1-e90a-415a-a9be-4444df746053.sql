-- Create core tables for BOOM! AI Video Editor

-- Create users profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT,
  progress INTEGER CHECK (progress >= 0 AND progress <= 100),
  style TEXT NOT NULL,
  duration_s INTEGER NOT NULL CHECK (duration_s >= 10 AND duration_s <= 30),
  bpm INTEGER,
  preview_url TEXT,
  output_url TEXT,
  logs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  timeline JSONB,
  captions JSONB
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Create security definer function for user role checking
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Jobs policies
CREATE POLICY "Users can view their own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Assets policies
CREATE POLICY "Users can view assets for their jobs"
  ON public.assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = assets.job_id 
    AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can create assets for their jobs"
  ON public.assets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = assets.job_id 
    AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update assets for their jobs"
  ON public.assets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = assets.job_id 
    AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete assets for their jobs"
  ON public.assets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = assets.job_id 
    AND jobs.user_id = auth.uid()
  ));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan)
  VALUES (new.id, new.email, 'free');
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_assets_job_id ON public.assets(job_id);
CREATE INDEX idx_assets_kind ON public.assets(kind);

-- Add constraints for valid enum values
ALTER TABLE public.jobs ADD CONSTRAINT valid_status 
  CHECK (status IN ('queued', 'processing', 'rendering', 'completed', 'failed', 'cancelled'));

ALTER TABLE public.jobs ADD CONSTRAINT valid_stage 
  CHECK (stage IS NULL OR stage IN ('beats', 'scenes', 'timeline', 'preview', 'final'));

ALTER TABLE public.jobs ADD CONSTRAINT valid_style 
  CHECK (style IN ('rgb', 'lux'));

ALTER TABLE public.assets ADD CONSTRAINT valid_kind 
  CHECK (kind IN ('video', 'image', 'music'));