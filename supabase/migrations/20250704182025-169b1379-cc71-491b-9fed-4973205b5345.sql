-- Add additional profile fields for comprehensive user data
ALTER TABLE public.profiles 
ADD COLUMN date_of_birth DATE,
ADD COLUMN gender TEXT,
ADD COLUMN location_country TEXT,
ADD COLUMN location_state TEXT,
ADD COLUMN medical_history TEXT;