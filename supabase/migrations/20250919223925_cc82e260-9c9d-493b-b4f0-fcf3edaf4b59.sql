-- Add multi-currency support to exchange_rates table
INSERT INTO exchange_rates (currency, rate, updated_at) VALUES 
('USD', 1.0, now()),
('GBP', 1.27, now()),
('EUR', 1.08, now()),
('CAD', 0.74, now()),
('AUD', 0.66, now()),
('INR', 0.012, now()),
('ZAR', 0.055, now()),
('KES', 0.0077, now()),
('GHS', 0.063, now()),
('EGP', 0.020, now())
ON CONFLICT (currency) DO UPDATE SET 
  rate = EXCLUDED.rate,
  updated_at = EXCLUDED.updated_at;

-- Add currency tracking to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS local_amount NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC;

-- Add currency tracking to consultation_payments table  
ALTER TABLE consultation_payments ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE consultation_payments ADD COLUMN IF NOT EXISTS local_amount NUMERIC;
ALTER TABLE consultation_payments ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC;

-- Add payment provider tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paystack';
ALTER TABLE consultation_payments ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paystack';

-- Update existing records with default values
UPDATE payments SET currency = 'NGN', provider = 'paystack' WHERE currency IS NULL;
UPDATE consultation_payments SET currency = 'NGN', provider = 'paystack' WHERE currency IS NULL;