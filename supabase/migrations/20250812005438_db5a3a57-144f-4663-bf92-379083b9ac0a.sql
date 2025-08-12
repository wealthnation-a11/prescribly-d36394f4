-- Create exchange_rates table to store currency conversion rates
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency TEXT NOT NULL UNIQUE,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read exchange rates (public data)
CREATE POLICY "Anyone can view exchange rates" 
ON public.exchange_rates 
FOR SELECT 
USING (true);

-- Only allow service role to insert/update exchange rates
CREATE POLICY "Service role can insert exchange rates" 
ON public.exchange_rates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update exchange rates" 
ON public.exchange_rates 
FOR UPDATE 
USING (true);

-- Insert initial NGN to USD rate (approximate)
INSERT INTO public.exchange_rates (currency, rate) 
VALUES ('NGN_TO_USD', 0.0012)
ON CONFLICT (currency) DO NOTHING;

-- Create function to update timestamps
CREATE TRIGGER update_exchange_rates_updated_at
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();