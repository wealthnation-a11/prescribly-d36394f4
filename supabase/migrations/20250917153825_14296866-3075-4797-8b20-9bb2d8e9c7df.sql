-- Add updated_at column to consultation_payments
ALTER TABLE public.consultation_payments 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for updated_at
CREATE TRIGGER update_consultation_payments_updated_at
BEFORE UPDATE ON public.consultation_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();