-- Add pending and approved statuses to appointment_status enum properly
-- Need to use separate transactions for enum values

-- Add 'pending' status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        -- Use ALTER TYPE in a way that commits immediately
        EXECUTE 'ALTER TYPE appointment_status ADD VALUE ''pending''';
    END IF;
END $$;

-- Commit the first addition
COMMIT;

-- Add 'approved' status if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'appointment_status')) THEN
        EXECUTE 'ALTER TYPE appointment_status ADD VALUE ''approved''';
    END IF;
END $$;