-- Add admin access to payments, consultation_payments, and subscriptions tables

-- 1. Add admin access to payments table
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- 2. Add admin access to consultation_payments table
CREATE POLICY "Admins can view all consultation payments"
ON public.consultation_payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update consultation payments"
ON public.consultation_payments
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- 3. Add admin access to subscriptions table
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));