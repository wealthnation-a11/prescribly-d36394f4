import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// No request body needed - this is a cron/scheduled function
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`id, patient_id, doctor_id, scheduled_time, status, profiles!appointments_doctor_id_fkey(first_name, last_name)`)
      .eq('status', 'approved')
      .gte('scheduled_time', new Date().toISOString())
      .lte('scheduled_time', oneHourFromNow.toISOString());

    if (error) throw error;

    const remindersSent = [];

    for (const appointment of appointments || []) {
      const doctorName = `Dr. ${appointment.profiles.first_name} ${appointment.profiles.last_name}`;
      const appointmentTime = new Date(appointment.scheduled_time).toLocaleString();

      const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: appointment.patient_id,
          title: 'Appointment Reminder',
          body: `Your appointment with ${doctorName} is in 1 hour at ${appointmentTime}`,
          url: `/book-appointment`,
          type: 'appointment_reminder'
        }
      });

      if (!pushError) remindersSent.push(appointment.id);
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent.length, appointments_checked: appointments?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
