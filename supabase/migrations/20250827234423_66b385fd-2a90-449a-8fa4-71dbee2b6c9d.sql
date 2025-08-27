-- ===============================
-- Enhanced End-to-End Encrypted Chats
-- ===============================

-- Add encryption-specific columns to existing chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS encrypted_message TEXT,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS key_exchange_data JSONB;

-- Add encryption-specific columns to existing messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS encrypted_message_text TEXT,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS key_exchange_data JSONB;

-- ===============================
-- Encryption Helper Functions
-- ===============================

-- Function to validate encrypted content format
CREATE OR REPLACE FUNCTION validate_encrypted_content(content TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if content looks like valid encrypted data
    -- Basic validation - content should be non-null and reasonable length
    RETURN content IS NOT NULL AND length(content) > 32 AND content ~ '^[A-Za-z0-9+/=]+$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================
-- Audit Trail for Encrypted Messages
-- ===============================

CREATE TABLE IF NOT EXISTS encrypted_message_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    encrypted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    encryption_version INTEGER DEFAULT 1
);

-- Enable RLS on audit table
ALTER TABLE encrypted_message_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_audit_logs"
ON encrypted_message_audit
FOR SELECT
USING (auth.uid() = user_id);

-- ===============================
-- Enhanced RLS Policies for Encryption Support
-- ===============================

-- Update existing chats policies to support encryption
CREATE POLICY "users_can_insert_encrypted_chats"
ON chats
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    (message IS NOT NULL OR encrypted_message IS NOT NULL) AND
    -- Ensure at least one message format is provided
    NOT (message IS NOT NULL AND encrypted_message IS NOT NULL)
);

CREATE POLICY "users_can_update_chat_encryption"
ON chats
FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
WITH CHECK (
    auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Update existing messages policies for encryption
CREATE POLICY "users_can_insert_encrypted_messages"
ON messages
FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    (message_text IS NOT NULL OR encrypted_message_text IS NOT NULL) AND
    -- Ensure at least one message format is provided
    NOT (message_text IS NOT NULL AND encrypted_message_text IS NOT NULL)
);

-- ===============================
-- Triggers for Encryption Audit
-- ===============================

CREATE OR REPLACE FUNCTION log_encryption_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.encrypted_message IS NOT NULL OR NEW.encrypted_message_text IS NOT NULL THEN
        INSERT INTO encrypted_message_audit (
            table_name, 
            record_id, 
            action, 
            user_id, 
            encryption_version
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            auth.uid(),
            COALESCE(NEW.encryption_version, 1)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS chats_encryption_audit ON chats;
CREATE TRIGGER chats_encryption_audit
    AFTER INSERT OR UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION log_encryption_audit();

DROP TRIGGER IF EXISTS messages_encryption_audit ON messages;
CREATE TRIGGER messages_encryption_audit
    AFTER INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION log_encryption_audit();

-- ===============================
-- User Encryption Keys Table
-- ===============================

CREATE TABLE IF NOT EXISTS user_encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    public_key TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, key_version)
);

-- Enable RLS on encryption keys table
ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_manage_own_keys"
ON user_encryption_keys
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_view_others_public_keys"
ON user_encryption_keys
FOR SELECT
USING (is_active = TRUE);

-- Add trigger for updated_at
CREATE TRIGGER update_user_encryption_keys_updated_at
    BEFORE UPDATE ON user_encryption_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();