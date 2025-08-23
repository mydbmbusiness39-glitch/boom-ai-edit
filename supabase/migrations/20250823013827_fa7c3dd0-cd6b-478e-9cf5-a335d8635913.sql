-- Create video library tables
CREATE TABLE public.video_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  mime_type TEXT NOT NULL,
  
  -- Library metadata
  title TEXT,
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  folder_path TEXT DEFAULT '/',
  is_favorite BOOLEAN DEFAULT false,
  
  -- Processing info
  job_id UUID REFERENCES public.jobs_new(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload', 'processed', 'imported')),
  processing_status TEXT DEFAULT 'ready' CHECK (processing_status IN ('ready', 'processing', 'error')),
  
  -- Backup and sync status
  auto_backup_enabled BOOLEAN DEFAULT true,
  backup_status TEXT DEFAULT 'pending' CHECK (backup_status IN ('pending', 'backed_up', 'failed')),
  cloud_sync_status JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cloud sync configurations table
CREATE TABLE public.cloud_sync_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL CHECK (provider IN ('google_drive', 'dropbox', 'onedrive')),
  is_enabled BOOLEAN DEFAULT false,
  
  -- OAuth tokens and config (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Sync preferences
  auto_sync_new_videos BOOLEAN DEFAULT true,
  sync_folder_path TEXT DEFAULT '/BOOM_Videos',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'disconnected' CHECK (sync_status IN ('connected', 'disconnected', 'syncing', 'error')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, provider),
  UNIQUE(team_id, provider)
);

-- Create sync operations log
CREATE TABLE public.sync_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID REFERENCES public.video_library(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  
  operation_type TEXT NOT NULL CHECK (operation_type IN ('upload', 'download', 'delete', 'sync')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  
  -- Cloud file info
  cloud_file_id TEXT,
  cloud_file_path TEXT,
  cloud_file_url TEXT,
  
  -- Operation details
  bytes_transferred BIGINT DEFAULT 0,
  total_bytes BIGINT,
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('video-library', 'video-library', false),
  ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.video_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_library
CREATE POLICY "Users can view their own videos" 
ON public.video_library 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id OR
  (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = video_library.team_id 
      AND team_members.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create their own videos" 
ON public.video_library 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
ON public.video_library 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = user_id OR
  (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = video_library.team_id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'manager', 'editor')
    )
  )
);

CREATE POLICY "Users can delete their own videos" 
ON public.video_library 
FOR DELETE 
TO authenticated
USING (
  auth.uid() = user_id OR
  (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = video_library.team_id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'manager')
    )
  )
);

-- RLS Policies for cloud_sync_configs
CREATE POLICY "Users can manage their own sync configs" 
ON public.cloud_sync_configs 
FOR ALL 
TO authenticated
USING (
  auth.uid() = user_id OR
  (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_members.team_id = cloud_sync_configs.team_id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'manager')
    )
  )
);

-- RLS Policies for sync_operations
CREATE POLICY "Users can view their own sync operations" 
ON public.sync_operations 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync operations" 
ON public.sync_operations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Storage policies for video-library bucket
CREATE POLICY "Users can view their own library videos" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'video-library' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload to their own library" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'video-library' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own library videos" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'video-library' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own library videos" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'video-library' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for video-thumbnails bucket (public read)
CREATE POLICY "Anyone can view thumbnails" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Users can upload thumbnails" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'video-thumbnails');

-- Add triggers for updated_at
CREATE TRIGGER update_video_library_updated_at
BEFORE UPDATE ON public.video_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cloud_sync_configs_updated_at
BEFORE UPDATE ON public.cloud_sync_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_video_library_user_id ON public.video_library(user_id);
CREATE INDEX idx_video_library_team_id ON public.video_library(team_id);
CREATE INDEX idx_video_library_source_type ON public.video_library(source_type);
CREATE INDEX idx_video_library_tags ON public.video_library USING gin(tags);
CREATE INDEX idx_video_library_folder_path ON public.video_library(folder_path);
CREATE INDEX idx_video_library_created_at ON public.video_library(created_at DESC);

CREATE INDEX idx_sync_operations_user_id ON public.sync_operations(user_id);
CREATE INDEX idx_sync_operations_video_id ON public.sync_operations(video_id);
CREATE INDEX idx_sync_operations_status ON public.sync_operations(status);

-- Function to auto-backup processed videos
CREATE OR REPLACE FUNCTION public.auto_backup_processed_video()
RETURNS TRIGGER AS $$
BEGIN
  -- When a job is completed, auto-backup the output video
  IF NEW.status = 'completed' AND NEW.output_url IS NOT NULL AND OLD.status != 'completed' THEN
    -- Insert into video library for auto-backup
    INSERT INTO public.video_library (
      user_id,
      team_id,
      filename,
      original_filename,
      file_path,
      file_size,
      title,
      job_id,
      source_type,
      processing_status,
      auto_backup_enabled
    ) VALUES (
      NEW.user_id,
      NEW.team_id,
      split_part(NEW.output_url, '/', -1),
      NEW.name || '_processed.mp4',
      NEW.output_url,
      0, -- Will be updated by background process
      NEW.name,
      NEW.id,
      'processed',
      'ready',
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;