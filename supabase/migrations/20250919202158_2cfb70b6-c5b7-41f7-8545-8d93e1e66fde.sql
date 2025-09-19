-- Update synectics01@gmail.com from admin to patient role
-- Keep is_legacy = true for full access without payment prompts
UPDATE profiles 
SET role = 'patient'::user_role 
WHERE email = 'synectics01@gmail.com';