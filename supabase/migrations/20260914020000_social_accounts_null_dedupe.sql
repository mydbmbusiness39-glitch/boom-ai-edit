-- Gate #78: NULL-safe dedupe guard for social_accounts.
--
-- Problem: the dedupe key (user_id, platform, platform_account_id) silently
-- fails when platform_account_id IS NULL, because Postgres treats NULLs as
-- distinct in unique indexes. Every OAuth consent therefore inserted a NEW
-- row instead of updating the existing one.
--
-- Fix: expression unique index that folds NULL to ''. Additive only —
-- no column/row changes, no RLS changes, TikTok rows untouched.

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_platform_acct_uniq
  ON public.social_accounts (user_id, platform, COALESCE(platform_account_id, ''));

COMMENT ON INDEX public.social_accounts_user_platform_acct_uniq IS
  'Gate #78 NULL-safe dedupe: one account per (user, platform, coalesce(platform_account_id, ''''))';
