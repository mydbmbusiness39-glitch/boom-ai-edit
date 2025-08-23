-- Create user_security table for 2FA settings
CREATE TABLE public.user_security (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret TEXT,
  backup_codes TEXT[],
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  phone_number TEXT,
  recovery_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create api_tokens table for secure API integrations
CREATE TABLE public.api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '[]'::jsonb,
  scopes TEXT[] DEFAULT ARRAY['read']::text[],
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media_encryption_keys table for end-to-end encryption
CREATE TABLE public.media_encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_version INTEGER DEFAULT 1,
  algorithm TEXT DEFAULT 'AES-256-GCM',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_name, key_version)
);

-- Create encrypted_uploads table to track encrypted media
CREATE TABLE public.encrypted_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  encrypted_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  encryption_key_id UUID REFERENCES public.media_encryption_keys(id),
  checksum TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encrypted_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_security
CREATE POLICY "Users can manage their own security settings" 
ON public.user_security 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for api_tokens
CREATE POLICY "Users can manage their own API tokens" 
ON public.api_tokens 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for media_encryption_keys
CREATE POLICY "Users can manage their own encryption keys" 
ON public.media_encryption_keys 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for encrypted_uploads
CREATE POLICY "Users can manage their own encrypted uploads" 
ON public.encrypted_uploads 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_security_user_id ON public.user_security(user_id);
CREATE INDEX idx_api_tokens_user_id ON public.api_tokens(user_id);
CREATE INDEX idx_api_tokens_token_hash ON public.api_tokens(token_hash);
CREATE INDEX idx_media_encryption_keys_user_id ON public.media_encryption_keys(user_id);
CREATE INDEX idx_encrypted_uploads_user_id ON public.encrypted_uploads(user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_user_security_updated_at
  BEFORE UPDATE ON public.user_security
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_tokens_updated_at
  BEFORE UPDATE ON public.api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_encryption_keys_updated_at
  BEFORE UPDATE ON public.media_encryption_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_encrypted_uploads_updated_at
  BEFORE UPDATE ON public.encrypted_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();