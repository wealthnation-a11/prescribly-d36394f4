-- Update default status for new appointments to be 'pending'
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'pending'::appointment_status;

-- Enable real-time for appointments table
ALTER TABLE appointments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- Enable real-time for chats table  
ALTER TABLE chats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;