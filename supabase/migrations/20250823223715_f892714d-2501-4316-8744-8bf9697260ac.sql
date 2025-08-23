-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.get_user_team_role(team_uuid uuid, user_uuid uuid)
 RETURNS team_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role public.team_role;
BEGIN
  SELECT role INTO user_role
  FROM public.team_members
  WHERE team_id = team_uuid AND user_id = user_uuid;
  
  RETURN user_role;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_affiliate_stats(link_id uuid, stat_type text, amount numeric DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF stat_type = 'click' THEN
    UPDATE affiliate_links 
    SET click_count = click_count + 1, updated_at = now()
    WHERE id = link_id;
  ELSIF stat_type = 'conversion' THEN
    UPDATE affiliate_links 
    SET conversion_count = conversion_count + 1, 
        revenue_total = revenue_total + amount,
        updated_at = now()
    WHERE id = link_id;
  END IF;
END;
$function$;