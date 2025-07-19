-- Create the user_role enum type that's missing
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');

-- Create the verification_status enum type
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create the appointment_status enum type  
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');

-- Create the prescription_status enum type
CREATE TYPE prescription_status AS ENUM ('pending', 'filled', 'cancelled');

-- Create the ticket_status enum type
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');