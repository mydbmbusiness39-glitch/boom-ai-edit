-- Gate #78 Phase C2: browser roles must not reach OAuth token ciphertext.
--
-- Before: anon/authenticated held TABLE-LEVEL privileges on social_accounts, so
-- column-level REVOKE alone would have been a no-op (Postgres privileges are
-- additive: a table grant still authorizes every column). We therefore revoke
-- the table-level grant and re-grant an explicit safe column list.
--
-- Tokens stay fully usable by trusted backend code: Edge Functions and the
-- worker use the service_role key, which is untouched here.
--
-- No rows, tokens, columns or RLS policies are modified.

REVOKE ALL PRIVILEGES ON public.social_accounts FROM anon;
REVOKE ALL PRIVILEGES ON public.social_accounts FROM authenticated;

-- Safe columns ONLY. access_token_encrypted / refresh_token_encrypted are
-- deliberately absent from every grant below.
GRANT SELECT (
  id, user_id, platform, platform_account_id, platform_username, display_name,
  token_expires_at, refresh_expires_at, scopes, status, created_at, updated_at, revoked_at
) ON public.social_accounts TO authenticated;

GRANT INSERT (
  user_id, platform, platform_account_id, platform_username, display_name,
  token_expires_at, refresh_expires_at, scopes, status, revoked_at
) ON public.social_accounts TO authenticated;

GRANT UPDATE (
  platform, platform_account_id, platform_username, display_name,
  token_expires_at, refresh_expires_at, scopes, status, revoked_at, updated_at
) ON public.social_accounts TO authenticated;

-- anon gets no privileges at all. RLS already denies it every row.
