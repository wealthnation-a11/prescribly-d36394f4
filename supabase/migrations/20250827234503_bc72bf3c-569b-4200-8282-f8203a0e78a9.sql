-- Fix function search path security issues
CREATE OR REPLACE FUNCTION validate_encrypted_content(content TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    -- Check if content looks like valid encrypted data
    -- Basic validation - content should be non-null and reasonable length
    RETURN content IS NOT NULL AND length(content) > 32 AND content ~ '^[A-Za-z0-9+/=]+$';
END;
$$;

CREATE OR REPLACE FUNCTION log_encryption_audit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;