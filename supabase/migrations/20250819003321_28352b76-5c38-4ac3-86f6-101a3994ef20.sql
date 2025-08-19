-- Fix security issues: restrict policies to authenticated users only

-- Update function search paths
CREATE OR REPLACE FUNCTION public.check_job_limit(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.increment_job_count(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update RLS policies to restrict to authenticated users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Update jobs_new policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs_new;
DROP POLICY IF EXISTS "Users can create their own jobs" ON public.jobs_new;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs_new;

CREATE POLICY "Users can view their own jobs" 
ON public.jobs_new 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.jobs_new 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.jobs_new 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Update uploads policies
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can create their own uploads" ON public.uploads;

CREATE POLICY "Users can view their own uploads" 
ON public.uploads 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" 
ON public.uploads 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update existing jobs table policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON public.jobs;

CREATE POLICY "Users can view their own jobs" 
ON public.jobs 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.jobs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.jobs 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
ON public.jobs 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Update assets table policies  
DROP POLICY IF EXISTS "Users can view assets for their jobs" ON public.assets;
DROP POLICY IF EXISTS "Users can create assets for their jobs" ON public.assets;
DROP POLICY IF EXISTS "Users can update assets for their jobs" ON public.assets;
DROP POLICY IF EXISTS "Users can delete assets for their jobs" ON public.assets;

CREATE POLICY "Users can view assets for their jobs" 
ON public.assets 
FOR SELECT 
TO authenticated
USING (EXISTS ( SELECT 1 FROM jobs WHERE jobs.id = assets.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can create assets for their jobs" 
ON public.assets 
FOR INSERT 
TO authenticated
WITH CHECK (EXISTS ( SELECT 1 FROM jobs WHERE jobs.id = assets.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can update assets for their jobs" 
ON public.assets 
FOR UPDATE 
TO authenticated
USING (EXISTS ( SELECT 1 FROM jobs WHERE jobs.id = assets.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can delete assets for their jobs" 
ON public.assets 
FOR DELETE 
TO authenticated
USING (EXISTS ( SELECT 1 FROM jobs WHERE jobs.id = assets.job_id AND jobs.user_id = auth.uid()));

-- Update storage policies
DROP POLICY IF EXISTS "Users can view their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

CREATE POLICY "Users can view their own uploads" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);