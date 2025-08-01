import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { doctor_id, date, time, reason } = await req.json();

    // Validate required fields
    if (!doctor_id || !date || !time || !reason) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Combine date and time for appointment_date
    const appointmentDate = new Date(`${date}T${time}`);
    
    // Check if the doctor is available at this time
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointmentDate.toISOString())
      .neq('status', 'cancelled');

    if (checkError) {
      console.error('Error checking availability:', checkError);
      return new Response(JSON.stringify({ error: 'Error checking availability' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return new Response(JSON.stringify({ error: 'Doctor is not available at this time' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get doctor's consultation fee
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('consultation_fee')
      .eq('user_id', doctor_id)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor data:', doctorError);
      return new Response(JSON.stringify({ error: 'Error fetching doctor data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: doctor_id,
        appointment_date: appointmentDate.toISOString(),
        notes: reason,
        consultation_fee: doctorData?.consultation_fee || 0,
        status: 'scheduled'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating appointment:', createError);
      return new Response(JSON.stringify({ error: 'Failed to book appointment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      appointment: appointment,
      message: 'Appointment booked successfully!' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in bookAppointment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});