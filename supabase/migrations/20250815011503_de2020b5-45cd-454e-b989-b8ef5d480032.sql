-- Enable UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update PROFILES table with additional fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS age int,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS weight numeric,
ADD COLUMN IF NOT EXISTS allergies text[];

-- Update profiles role enum to include all roles if not already present
DO $$ BEGIN
    CREATE TYPE user_role_extended AS ENUM ('patient', 'doctor', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1) DIAGNOSIS HISTORY
CREATE TABLE IF NOT EXISTS diagnosis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL,
    probability NUMERIC(5,2) NOT NULL,
    matched_symptoms TEXT[] NOT NULL DEFAULT '{}',
    explanation TEXT,
    auto_approval BOOLEAN DEFAULT true,
    red_flags BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2) PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS prescriptions_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID REFERENCES diagnosis_history(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    drug_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | pending_payment
    pdf_url TEXT,
    rxnorm_code TEXT,
    safety_warnings TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3) WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    user_id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('doctor','admin','patient')),
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4) TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    admin_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    doctor_share NUMERIC(12,2) NOT NULL,
    admin_share NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed
    type TEXT NOT NULL CHECK (type IN ('consultation','withdrawal','deposit')),
    reference TEXT,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-create wallet on new profile
CREATE OR REPLACE FUNCTION create_wallet_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IN ('doctor','admin','patient') THEN
        INSERT INTO wallets(user_id, role) VALUES(NEW.user_id, NEW.role)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER IF NOT EXISTS trg_create_wallet
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_wallet_on_profile_insert();

-- Enable RLS
ALTER TABLE diagnosis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_new ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnosis_history
CREATE POLICY "Patients can view own diagnoses" ON diagnosis_history
    FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Patients can create own diagnoses" ON diagnosis_history
    FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can view all diagnoses" ON diagnosis_history
    FOR SELECT USING (has_role(auth.uid(), 'doctor'::user_role));

CREATE POLICY "Admins can view all diagnoses" ON diagnosis_history
    FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for prescriptions_new
CREATE POLICY "Patients can view own prescriptions" ON prescriptions_new
    FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view assigned prescriptions" ON prescriptions_new
    FOR SELECT USING (doctor_id = auth.uid() OR has_role(auth.uid(), 'doctor'::user_role));

CREATE POLICY "Doctors can update prescriptions" ON prescriptions_new
    FOR UPDATE USING (doctor_id = auth.uid() OR has_role(auth.uid(), 'doctor'::user_role));

CREATE POLICY "Patients can create prescriptions" ON prescriptions_new
    FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Admins can view all prescriptions" ON prescriptions_new
    FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for wallets
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallets" ON wallets
    FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can update wallets" ON wallets
    FOR UPDATE USING (true);

CREATE POLICY "Service can insert wallets" ON wallets
    FOR INSERT WITH CHECK (true);

-- RLS Policies for transactions_new
CREATE POLICY "Users can view own transactions" ON transactions_new
    FOR SELECT USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR admin_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON transactions_new
    FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Service can insert transactions" ON transactions_new
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update transactions" ON transactions_new
    FOR UPDATE USING (true);

-- Update triggers for timestamps
CREATE TRIGGER update_prescriptions_updated_at
    BEFORE UPDATE ON prescriptions_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();