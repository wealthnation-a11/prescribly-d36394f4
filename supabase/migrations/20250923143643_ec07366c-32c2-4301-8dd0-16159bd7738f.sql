-- Create trigger to automatically create notifications when appointments are created or status changes
CREATE OR REPLACE FUNCTION notify_appointment_changes()
RETURNS TRIGGER AS $$
DECLARE
    service_role_client TEXT;
BEGIN
    service_role_client := 'supabase-admin';
    
    -- When a new appointment is created (notify doctor)
    IF TG_OP = 'INSERT' THEN
        -- Create notification for doctor
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            data,
            read,
            created_at
        ) VALUES (
            NEW.doctor_id,
            'appointment_request',
            'New Appointment Request',
            'A patient has requested an appointment with you.',
            jsonb_build_object(
                'appointment_id', NEW.id,
                'patient_id', NEW.patient_id,
                'scheduled_time', NEW.scheduled_time,
                'notes', NEW.notes
            ),
            false,
            NOW()
        );
        RETURN NEW;
    END IF;
    
    -- When appointment status changes (notify patient)
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Notify patient about status changes
        IF NEW.status = 'approved' THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                data,
                read,
                created_at
            ) VALUES (
                NEW.patient_id,
                'appointment_approved',
                'Appointment Approved',
                'Your appointment has been approved! You can now chat with the doctor.',
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'doctor_id', NEW.doctor_id,
                    'scheduled_time', NEW.scheduled_time
                ),
                false,
                NOW()
            );
        ELSIF NEW.status = 'cancelled' THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                data,
                read,
                created_at
            ) VALUES (
                NEW.patient_id,
                'appointment_cancelled',
                'Appointment Cancelled',
                'Your appointment has been cancelled.',
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'doctor_id', NEW.doctor_id,
                    'scheduled_time', NEW.scheduled_time
                ),
                false,
                NOW()
            );
        ELSIF NEW.status = 'completed' THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                data,
                read,
                created_at
            ) VALUES (
                NEW.patient_id,
                'appointment_completed',
                'Appointment Completed',
                'Your appointment has been completed.',
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'doctor_id', NEW.doctor_id,
                    'scheduled_time', NEW.scheduled_time
                ),
                false,
                NOW()
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on appointments table
DROP TRIGGER IF EXISTS appointment_notification_trigger ON public.appointments;
CREATE TRIGGER appointment_notification_trigger
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_changes();