-- Gate #78 Phase B: TikTok social publishing infrastructure.
-- No workspace_id: Boom jobs_new is user_id-scoped (no workspace architecture).
-- Encrypted token columns are never granted to anon/authenticated.

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok')),
  platform_account_id TEXT,
  platform_username TEXT,
  display_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  refresh_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'setup_required')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, platform, platform_account_id)
);

CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  boom_job_id UUID NOT NULL REFERENCES public.jobs_new(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok')),
  title TEXT,
  caption TEXT,
  hashtags TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'SELF_ONLY' CHECK (privacy_level IN (
    'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'
  )),
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  publish_status TEXT NOT NULL DEFAULT 'pending' CHECK (publish_status IN (
    'pending', 'processing', 'published', 'failed', 'token_expired', 'revoked'
  )),
  platform_publish_id TEXT,
  platform_post_id TEXT,
  platform_post_url TEXT,
  error_code TEXT,
  error_message_sanitized TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE (boom_job_id, social_account_id)
);

CREATE TABLE IF NOT EXISTS public.social_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'tiktok',
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS social_accounts_user_idx ON public.social_accounts (user_id);
CREATE INDEX IF NOT EXISTS publish_jobs_user_idx ON public.publish_jobs (user_id);
CREATE INDEX IF NOT EXISTS publish_jobs_boom_job_idx ON public.publish_jobs (boom_job_id);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social accounts"
  ON public.social_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social accounts"
  ON public.social_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts"
  ON public.social_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts"
  ON public.social_accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own publish jobs"
  ON public.publish_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own publish jobs"
  ON public.publish_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own publish jobs"
  ON public.publish_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own oauth states"
  ON public.social_oauth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own oauth states"
  ON public.social_oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oauth states"
  ON public.social_oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- Client roles must never read ciphertext token columns.
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted)
  ON public.social_accounts FROM anon, authenticated;

CREATE OR REPLACE VIEW public.social_accounts_safe AS
SELECT
  id,
  user_id,
  platform,
  platform_account_id,
  platform_username,
  display_name,
  token_expires_at,
  refresh_expires_at,
  scopes,
  status,
  created_at,
  updated_at,
  revoked_at
FROM public.social_accounts;

GRANT SELECT ON public.social_accounts_safe TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_social_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS social_accounts_touch ON public.social_accounts;
CREATE TRIGGER social_accounts_touch
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_social_updated_at();

DROP TRIGGER IF EXISTS publish_jobs_touch ON public.publish_jobs;
CREATE TRIGGER publish_jobs_touch
  BEFORE UPDATE ON public.publish_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_social_updated_at();
