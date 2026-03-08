
-- Enable pg_net extension for making HTTP requests from DB triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to sync user_roles when a profile is inserted
CREATE OR REPLACE FUNCTION public.sync_user_roles_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, NEW.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trg_sync_user_roles_on_profile_insert ON public.profiles;
CREATE TRIGGER trg_sync_user_roles_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles_on_profile_insert();

-- Update notify_appointment_changes to call send-appointment-email via pg_net
CREATE OR REPLACE FUNCTION public.notify_appointment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- When a new appointment is created (notify doctor)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (
            user_id, type, title, message, data, read, created_at
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
            false, NOW()
        );

        -- Call send-appointment-email edge function via pg_net
        IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
          PERFORM extensions.http_post(
            url := supabase_url || '/functions/v1/send-appointment-email',
            body := json_build_object(
              'appointment_id', NEW.id,
              'notification_type', 'appointment_request'
            )::text,
            headers := json_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || service_role_key
            )::jsonb
          );
        END IF;

        RETURN NEW;
    END IF;
    
    -- When appointment status changes (notify patient)
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        IF NEW.status = 'approved' THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, data, read, created_at
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
                false, NOW()
            );

            IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
              PERFORM extensions.http_post(
                url := supabase_url || '/functions/v1/send-appointment-email',
                body := json_build_object(
                  'appointment_id', NEW.id,
                  'notification_type', 'appointment_approved'
                )::text,
                headers := json_build_object(
                  'Content-Type', 'application/json',
                  'Authorization', 'Bearer ' || service_role_key
                )::jsonb
              );
            END IF;

        ELSIF NEW.status = 'cancelled' THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, data, read, created_at
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
                false, NOW()
            );
        ELSIF NEW.status = 'completed' THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, data, read, created_at
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
                false, NOW()
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$;
