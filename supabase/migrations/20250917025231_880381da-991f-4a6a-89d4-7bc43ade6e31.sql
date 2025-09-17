-- Create call_logs table for financial tracking
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  call_session_id uuid REFERENCES public.call_sessions(id),
  call_date timestamp with time zone DEFAULT now(),
  duration_minutes integer DEFAULT 0,
  patient_payment numeric(10,2) DEFAULT 0,
  doctor_earnings numeric(10,2) DEFAULT 0,
  admin_fee numeric(10,2) DEFAULT 0,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call_logs
CREATE POLICY "Doctors can view their own call logs" ON public.call_logs
  FOR SELECT USING (auth.uid() = doctor_id);
  
CREATE POLICY "Admins can view all call logs" ON public.call_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
  
CREATE POLICY "System can create call logs" ON public.call_logs
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "System can update call logs" ON public.call_logs
  FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX idx_call_logs_doctor ON public.call_logs(doctor_id);
CREATE INDEX idx_call_logs_patient ON public.call_logs(patient_id);
CREATE INDEX idx_call_logs_date ON public.call_logs(call_date);