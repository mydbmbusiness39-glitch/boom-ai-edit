-- Gate #78 Meta Phase B: allow facebook + instagram as social publish targets.
--
-- CONSTRAINT-ONLY migration. No row is updated, deleted, or backfilled.
-- TikTok and YouTube behavior is preserved verbatim:
--   * their platform membership is unchanged
--   * their privacy vocabularies are byte-identical to the previous constraint
--
-- Privacy rationale (verified against the official Meta docs, Gate #78 Phase A):
--   * Facebook: "Publishing to a Page has implicit public scope, and only the
--     'Public' option should be available" -> there is NO privacy control, so the
--     only honest value is PUBLIC.
--   * Instagram: the publishing API exposes no per-post privacy/audience field,
--     so we store a single explicit platform-default marker instead of inventing
--     a privacy selector the API cannot honour.

-- 1) social_accounts.platform  ->  tiktok | youtube | facebook | instagram
ALTER TABLE public.social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_platform_check;
ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('tiktok', 'youtube', 'facebook', 'instagram'));

-- 2) publish_jobs.platform  ->  tiktok | youtube | facebook | instagram
ALTER TABLE public.publish_jobs
  DROP CONSTRAINT IF EXISTS publish_jobs_platform_check;
ALTER TABLE public.publish_jobs
  ADD CONSTRAINT publish_jobs_platform_check
  CHECK (platform IN ('tiktok', 'youtube', 'facebook', 'instagram'));

-- 3) publish_jobs.privacy_level  ->  platform-paired (tiktok/youtube unchanged)
ALTER TABLE public.publish_jobs
  DROP CONSTRAINT IF EXISTS publish_jobs_privacy_level_check;
ALTER TABLE public.publish_jobs
  ADD CONSTRAINT publish_jobs_privacy_level_check
  CHECK (
    (
      platform = 'tiktok'
      AND privacy_level IN (
        'PUBLIC_TO_EVERYONE',
        'MUTUAL_FOLLOW_FRIENDS',
        'FOLLOWER_OF_CREATOR',
        'SELF_ONLY'
      )
    )
    OR (
      platform = 'youtube'
      AND privacy_level IN ('private', 'unlisted', 'public')
    )
    OR (
      platform = 'facebook'
      AND privacy_level = 'PUBLIC'
    )
    OR (
      platform = 'instagram'
      AND privacy_level = 'PLATFORM_DEFAULT'
    )
  );
