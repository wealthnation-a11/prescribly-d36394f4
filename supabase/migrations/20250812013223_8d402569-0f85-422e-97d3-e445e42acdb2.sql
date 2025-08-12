-- Add pending and approved statuses to appointment_status enum
-- First check what values currently exist
-- We'll need to add 'pending' and 'approved' statuses

-- Update the appointment_status enum to include pending and approved
DO $$ 
BEGIN
    -- Add new enum values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        ALTER TYPE appointment_status ADD VALUE 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        ALTER TYPE appointment_status ADD VALUE 'approved';
    END IF;
END $$;

-- Update default status for new appointments to be 'pending'
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'pending'::appointment_status;

-- Enable real-time for appointments table
ALTER TABLE appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- Enable real-time for chats table
ALTER TABLE chats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;