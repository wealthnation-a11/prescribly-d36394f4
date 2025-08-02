-- Fix security linter warnings by updating function search paths
-- Update the existing function to have proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Set an empty search path to prevent search path injection
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;