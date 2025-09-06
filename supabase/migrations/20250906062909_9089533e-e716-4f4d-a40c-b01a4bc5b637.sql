-- Enable realtime for critical tables
ALTER publication supabase_realtime ADD TABLE appointments;
ALTER publication supabase_realtime ADD TABLE prescriptions;
ALTER publication supabase_realtime ADD TABLE chats;
ALTER publication supabase_realtime ADD TABLE user_activities;

-- Set replica identity to full for better real-time updates
ALTER TABLE appointments REPLICA IDENTITY FULL;
ALTER TABLE prescriptions REPLICA IDENTITY FULL;
ALTER TABLE chats REPLICA IDENTITY FULL;
ALTER TABLE user_activities REPLICA IDENTITY FULL;