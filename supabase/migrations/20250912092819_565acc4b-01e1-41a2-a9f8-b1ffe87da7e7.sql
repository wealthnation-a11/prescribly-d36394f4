-- Create diagnosis_sessions table with requested schema
CREATE TABLE IF NOT EXISTS public.diagnosis_sessions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions_v2 table with requested schema
CREATE TABLE IF NOT EXISTS public.prescriptions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    drugs JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'modified', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create condition_drug_map table for faster lookups
CREATE TABLE IF NOT EXISTS public.condition_drug_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_id TEXT NOT NULL,
    drug_name TEXT NOT NULL,
    rxnorm_id TEXT,
    first_line BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.prescriptions_v2 
ADD CONSTRAINT fk_prescriptions_diagnosis 
FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis_sessions_v2(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT fk_audit_diagnosis 
FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis_sessions_v2(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_v2_user_id ON public.diagnosis_sessions_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_v2_status ON public.diagnosis_sessions_v2(status);
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_v2_created_at ON public.diagnosis_sessions_v2(created_at);

CREATE INDEX IF NOT EXISTS idx_prescriptions_v2_diagnosis_id ON public.prescriptions_v2(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_v2_doctor_id ON public.prescriptions_v2(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_v2_patient_id ON public.prescriptions_v2(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_v2_status ON public.prescriptions_v2(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_diagnosis_id ON public.audit_logs(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_condition_drug_map_condition_id ON public.condition_drug_map(condition_id);
CREATE INDEX IF NOT EXISTS idx_condition_drug_map_drug_name ON public.condition_drug_map(drug_name);
CREATE INDEX IF NOT EXISTS idx_condition_drug_map_rxnorm_id ON public.condition_drug_map(rxnorm_id);
CREATE INDEX IF NOT EXISTS idx_condition_drug_map_first_line ON public.condition_drug_map(first_line);

-- Create trigger for updating updated_at column on diagnosis_sessions_v2
CREATE TRIGGER update_diagnosis_sessions_v2_updated_at
    BEFORE UPDATE ON public.diagnosis_sessions_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.diagnosis_sessions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_drug_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnosis_sessions_v2
CREATE POLICY "Users can create their own diagnosis sessions" 
ON public.diagnosis_sessions_v2 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own diagnosis sessions" 
ON public.diagnosis_sessions_v2 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagnosis sessions" 
ON public.diagnosis_sessions_v2 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view diagnosis sessions for review" 
ON public.diagnosis_sessions_v2 
FOR SELECT 
USING (has_role(auth.uid(), 'doctor'::user_role) AND status = 'pending');

CREATE POLICY "Doctors can update diagnosis sessions for review" 
ON public.diagnosis_sessions_v2 
FOR UPDATE 
USING (has_role(auth.uid(), 'doctor'::user_role) AND status = 'pending');

CREATE POLICY "Admins can view all diagnosis sessions" 
ON public.diagnosis_sessions_v2 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for prescriptions_v2
CREATE POLICY "Doctors can create prescriptions" 
ON public.prescriptions_v2 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Users can view their own prescriptions" 
ON public.prescriptions_v2 
FOR SELECT 
USING ((auth.uid() = patient_id) OR (auth.uid() = doctor_id));

CREATE POLICY "Doctors can update their own prescriptions" 
ON public.prescriptions_v2 
FOR UPDATE 
USING (auth.uid() = doctor_id);

CREATE POLICY "Admins can view all prescriptions" 
ON public.prescriptions_v2 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs for their diagnosis sessions" 
ON public.audit_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.diagnosis_sessions_v2 
        WHERE id = audit_logs.diagnosis_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Doctors can view audit logs for sessions they're involved in" 
ON public.audit_logs 
FOR SELECT 
USING (
    has_role(auth.uid(), 'doctor'::user_role) AND (
        auth.uid() = actor_id OR
        EXISTS (
            SELECT 1 FROM public.prescriptions_v2 
            WHERE diagnosis_id = audit_logs.diagnosis_id 
            AND doctor_id = auth.uid()
        )
    )
);

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for condition_drug_map
CREATE POLICY "Authenticated users can view condition drug mappings" 
ON public.condition_drug_map 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage condition drug mappings" 
ON public.condition_drug_map 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Doctors can view condition drug mappings" 
ON public.condition_drug_map 
FOR SELECT 
USING (has_role(auth.uid(), 'doctor'::user_role));

-- Insert some sample data for condition_drug_map
INSERT INTO public.condition_drug_map (condition_id, drug_name, rxnorm_id, first_line, notes) VALUES
('c1', 'Acetaminophen', '161', true, 'First-line treatment for mild to moderate pain and fever'),
('c1', 'Ibuprofen', '5640', true, 'Anti-inflammatory, good for pain and fever'),
('c1', 'Dextromethorphan', '3008', false, 'Cough suppressant for dry cough'),
('c2', 'Loratadine', '6188', true, 'Non-drowsy antihistamine for allergies'),
('c2', 'Cetirizine', '1160', true, 'Effective antihistamine, may cause mild drowsiness'),
('c2', 'Fluticasone', '18631', false, 'Nasal corticosteroid for persistent symptoms'),
('c3', 'Pseudoephedrine', '8745', true, 'Decongestant for sinus pressure'),
('c3', 'Amoxicillin', '723', false, 'Antibiotic if bacterial infection suspected'),
('c3', 'Saline nasal spray', NULL, true, 'Safe, non-medicated option for congestion')
ON CONFLICT DO NOTHING;