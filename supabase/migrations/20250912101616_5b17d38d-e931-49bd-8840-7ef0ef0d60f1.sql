-- Fix RLS policies for tables with enabled RLS but no policies
-- This addresses the "RLS Enabled No Policy" security findings

-- Add RLS policies for conditions table
-- Conditions are reference data that should be readable by authenticated users
-- but only modifiable by admins
CREATE POLICY "Authenticated users can view conditions" 
ON public.conditions 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage conditions" 
ON public.conditions 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Add RLS policies for condition_drug_map table
-- This is reference data that maps conditions to recommended drugs
-- Should be readable by authenticated users but only modifiable by admins
CREATE POLICY "Authenticated users can view condition drug mappings" 
ON public.condition_drug_map 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage condition drug mappings" 
ON public.condition_drug_map 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Add comment for documentation
COMMENT ON TABLE public.conditions IS 'Medical conditions reference data - readable by all authenticated users, manageable by admins only';
COMMENT ON TABLE public.condition_drug_map IS 'Condition-to-drug mapping reference data - readable by all authenticated users, manageable by admins only';