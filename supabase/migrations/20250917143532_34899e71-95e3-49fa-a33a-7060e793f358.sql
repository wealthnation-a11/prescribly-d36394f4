-- Update messages table structure for doctor-patient messaging
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES profiles(user_id) NOT NULL,
  patient_id uuid REFERENCES profiles(user_id) NOT NULL,
  content text NOT NULL,
  sender text CHECK (sender IN ('doctor', 'patient')) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Doctors can view messages for their patients" ON messages
  FOR SELECT USING (
    auth.uid() = doctor_id OR auth.uid() = patient_id
  );

CREATE POLICY "Doctors and patients can send messages" ON messages
  FOR INSERT WITH CHECK (
    (auth.uid() = doctor_id AND sender = 'doctor') OR
    (auth.uid() = patient_id AND sender = 'patient')
  );

-- Create call_logs table
CREATE TABLE call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES profiles(user_id) NOT NULL,
  patient_id uuid REFERENCES profiles(user_id) NOT NULL,
  channel_name text NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on call_logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_logs
CREATE POLICY "Users can view their own call logs" ON call_logs
  FOR SELECT USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

CREATE POLICY "Users can create call logs" ON call_logs
  FOR INSERT WITH CHECK (auth.uid() = doctor_id OR auth.uid() = patient_id);

CREATE POLICY "Users can update their own call logs" ON call_logs
  FOR UPDATE USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

-- Add indexes for performance
CREATE INDEX idx_messages_doctor_patient ON messages(doctor_id, patient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_call_logs_doctor_patient ON call_logs(doctor_id, patient_id);

-- Enable realtime for messages
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE call_logs REPLICA IDENTITY FULL;