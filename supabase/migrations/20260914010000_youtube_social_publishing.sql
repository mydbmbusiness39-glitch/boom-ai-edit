-- Gate #78 YouTube Shorts: extend social publishing without breaking TikTok.
-- Preserves existing social_accounts / publish_jobs rows and RLS.
-- No workspace_id. Encrypted token columns remain revoked from client roles.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.social_accounts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%platform%'
  LOOP
    EXECUTE format('ALTER TABLE public.social_accounts DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('tiktok', 'youtube'));

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.publish_jobs'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%platform%'
        OR pg_get_constraintdef(oid) ILIKE '%privacy_level%'
        OR pg_get_constraintdef(oid) ILIKE '%publish_status%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.publish_jobs DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.publish_jobs
  ADD CONSTRAINT publish_jobs_platform_check
  CHECK (platform IN ('tiktok', 'youtube'));

-- Platform-aware privacy: do not force TikTok enums onto YouTube.
ALTER TABLE public.publish_jobs
  ADD CONSTRAINT publish_jobs_privacy_level_check
  CHECK (
    (platform = 'tiktok' AND privacy_level IN (
      'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'
    ))
    OR
    (platform = 'youtube' AND privacy_level IN ('private', 'unlisted', 'public'))
  );

ALTER TABLE public.publish_jobs
  ADD CONSTRAINT publish_jobs_publish_status_check
  CHECK (publish_status IN (
    'pending', 'uploading', 'processing', 'published', 'failed', 'token_expired', 'revoked'
  ));

ALTER TABLE public.publish_jobs
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.social_oauth_states
  ALTER COLUMN platform SET DEFAULT 'tiktok';
