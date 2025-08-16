-- Fix security warnings for function search paths

-- Fix get_current_user_id function
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

-- Fix update_updated_at_column function  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';