-- Create voice models table for storing user voice clones
CREATE TABLE public.voice_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  elevenlabs_voice_id TEXT,
  sample_audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'training',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;

-- Create policies for voice models
CREATE POLICY "Users can view their own voice models" 
ON public.voice_models 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice models" 
ON public.voice_models 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice models" 
ON public.voice_models 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice models" 
ON public.voice_models 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create AI avatars table for storing user digital doubles
CREATE TABLE public.ai_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_type TEXT NOT NULL DEFAULT 'cartoon',
  avatar_url TEXT,
  animation_style TEXT DEFAULT 'friendly',
  voice_model_id UUID,
  status TEXT NOT NULL DEFAULT 'generating',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_avatars ENABLE ROW LEVEL SECURITY;

-- Create policies for AI avatars
CREATE POLICY "Users can view their own avatars" 
ON public.ai_avatars 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own avatars" 
ON public.ai_avatars 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatars" 
ON public.ai_avatars 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatars" 
ON public.ai_avatars 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create voice scripts table for storing generated speech content
CREATE TABLE public.voice_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  voice_model_id UUID,
  script_text TEXT NOT NULL,
  audio_url TEXT,
  script_type TEXT DEFAULT 'custom',
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_scripts ENABLE ROW LEVEL SECURITY;

-- Create policies for voice scripts
CREATE POLICY "Users can view their own voice scripts" 
ON public.voice_scripts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice scripts" 
ON public.voice_scripts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice scripts" 
ON public.voice_scripts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice scripts" 
ON public.voice_scripts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create dynamic overlays table for reaction configurations
CREATE TABLE public.dynamic_overlays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_id UUID,
  position TEXT DEFAULT 'bottom-right',
  size TEXT DEFAULT 'small',
  reactions JSONB DEFAULT '[]',
  trigger_keywords JSONB DEFAULT '[]',
  style_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dynamic_overlays ENABLE ROW LEVEL SECURITY;

-- Create policies for dynamic overlays
CREATE POLICY "Users can view their own overlays" 
ON public.dynamic_overlays 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own overlays" 
ON public.dynamic_overlays 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overlays" 
ON public.dynamic_overlays 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overlays" 
ON public.dynamic_overlays 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_voice_models_updated_at
BEFORE UPDATE ON public.voice_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_avatars_updated_at
BEFORE UPDATE ON public.ai_avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_scripts_updated_at
BEFORE UPDATE ON public.voice_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dynamic_overlays_updated_at
BEFORE UPDATE ON public.dynamic_overlays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();