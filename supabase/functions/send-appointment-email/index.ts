import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { appointment_id, notification_type } = await req.json();

    // Fetch appointment details with user information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor_profile:profiles!appointments_doctor_id_fkey(*),
        patient_profile:profiles!appointments_patient_id_fkey(*)
      `)
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      console.error('Error fetching appointment:', appointmentError);
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let emailData = {};
    
    if (notification_type === 'appointment_request') {
      // Email to doctor
      emailData = {
        to_email: appointment.doctor_profile?.email || '',
        subject: 'New Appointment Request - Prescribly',
        message: `Dear Dr. ${appointment.doctor_profile?.first_name || ''} ${appointment.doctor_profile?.last_name || ''},\n\nYou have received a new appointment request from ${appointment.patient_profile?.first_name || ''} ${appointment.patient_profile?.last_name || ''}.\n\nScheduled Time: ${new Date(appointment.scheduled_time).toLocaleString()}\n\nPlease log in to your dashboard to review and approve this appointment.\n\nBest regards,\nPrescribly Team`,
        notification_type: 'appointment_request'
      };
    } else if (notification_type === 'appointment_approved') {
      // Email to patient
      emailData = {
        to_email: appointment.patient_profile?.email || '',
        subject: 'Appointment Approved - Prescribly',
        message: `Dear ${appointment.patient_profile?.first_name || ''} ${appointment.patient_profile?.last_name || ''},\n\nYour appointment with Dr. ${appointment.doctor_profile?.first_name || ''} ${appointment.doctor_profile?.last_name || ''} has been approved!\n\nScheduled Time: ${new Date(appointment.scheduled_time).toLocaleString()}\n\nYou can now access your consultation through your dashboard.\n\nBest regards,\nPrescribly Team`,
        notification_type: 'appointment_approved'
      };
    }

    // Call the email notification function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email-notification', {
      body: emailData
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Appointment email notification processed',
        email_result: emailResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-appointment-email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});