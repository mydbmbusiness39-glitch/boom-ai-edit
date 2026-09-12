-- Owner/admin internal tier: single authoritative entitlement resolver.
-- Does not raise Free 5/day. Does not change job-processor / worker.

-- 1) Role on profiles (customer vs owner_admin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['customer'::text, 'owner_admin'::text]));

-- 2) Expand customer + internal plans on both plan and legacy tier
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (
    tier IS NULL OR tier = ANY (ARRAY[
      'free'::text,
      'pro'::text,
      'business'::text,
      'agency'::text,
      'enterprise_internal'::text
    ])
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (
    plan = ANY (ARRAY[
      'free'::text,
      'pro'::text,
      'business'::text,
      'agency'::text,
      'enterprise_internal'::text
    ])
  );

-- 3) Authoritative resolver. daily_job_limit NULL = unlimited.
CREATE OR REPLACE FUNCTION public.account_entitlements(user_uuid uuid)
RETURNS TABLE (
  role text,
  plan text,
  daily_job_limit integer,
  watermark boolean,
  ai_twin boolean,
  social_publish boolean,
  admin_test boolean
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
    RETURN NEXT;
    RETURN;
  END IF;

  role := 'customer';
  plan := resolved_plan;

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
    -- Unknown plan fail-closed to Free customer limits.
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

-- 4) Legacy check_job_limit uses the same resolver (not a second policy).
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

-- 5) CEO account — by auth user id, not email.
UPDATE public.profiles
SET role = 'owner_admin',
    plan = 'enterprise_internal',
    tier = 'enterprise_internal',
    updated_at = now()
WHERE id = '78a343fb-a9d8-4fcd-b8c5-71b9c670f0d5';
