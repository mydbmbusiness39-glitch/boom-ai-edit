-- Owner/admin paid transcription flags on the authoritative entitlement resolver.
-- Does NOT raise Free 5/day. Does NOT grant paid transcription to Pro/Business/Agency.
-- Recreates account_entitlements return row (Postgres cannot ADD columns to RETURNS TABLE in place).

DROP FUNCTION IF EXISTS public.check_job_limit(uuid);
DROP FUNCTION IF EXISTS public.account_entitlements(uuid);

CREATE FUNCTION public.account_entitlements(user_uuid uuid)
RETURNS TABLE (
  role text,
  plan text,
  daily_job_limit integer,
  watermark boolean,
  ai_twin boolean,
  social_publish boolean,
  admin_test boolean,
  paid_transcription_allowed boolean,
  auto_transcription boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec public.profiles%ROWTYPE;
  resolved_role text;
  resolved_plan text;
BEGIN
  SELECT * INTO rec FROM public.profiles WHERE id = user_uuid;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  resolved_role := COALESCE(NULLIF(rec.role, ''), 'customer');
  resolved_plan := COALESCE(NULLIF(rec.plan, ''), NULLIF(rec.tier, ''), 'free');

  IF resolved_role = 'owner_admin' OR resolved_plan = 'enterprise_internal' THEN
    role := 'owner_admin';
    plan := 'enterprise_internal';
    daily_job_limit := NULL;
    watermark := false;
    ai_twin := true;
    social_publish := true;
    admin_test := true;
    paid_transcription_allowed := true;
    auto_transcription := true;
    RETURN NEXT;
    RETURN;
  END IF;

  role := 'customer';
  plan := resolved_plan;
  paid_transcription_allowed := false;
  auto_transcription := false;

  IF resolved_plan = 'free' THEN
    daily_job_limit := 5;
    watermark := true;
    ai_twin := false;
    social_publish := false;
    admin_test := false;
  ELSIF resolved_plan IN ('pro', 'business', 'agency') THEN
    daily_job_limit := NULL;
    watermark := false;
    ai_twin := (resolved_plan IN ('business', 'agency'));
    social_publish := (resolved_plan IN ('business', 'agency'));
    admin_test := false;
  ELSE
    plan := 'free';
    daily_job_limit := 5;
    watermark := true;
    ai_twin := false;
    social_publish := false;
    admin_test := false;
  END IF;

  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.account_entitlements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_entitlements(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.account_entitlements(uuid) TO authenticated;

-- Recreate check_job_limit against the new resolver signature (quota policy unchanged).
CREATE OR REPLACE FUNCTION public.check_job_limit(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  limit_n integer;
  jobs_today integer;
BEGIN
  SELECT e.daily_job_limit INTO limit_n
  FROM public.account_entitlements(user_uuid) e;

  IF limit_n IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT count(*)::int INTO jobs_today
  FROM public.jobs_new
  WHERE user_id = user_uuid
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc'
    AND created_at < date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc' + interval '1 day';

  RETURN jobs_today < limit_n;
END;
$function$;
