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
      return new Response(JSON.stringify({ error: 'Please fill in all required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return new Response(JSON.stringify({ error: 'Invalid date format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      return new Response(JSON.stringify({ error: 'Invalid time format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Combine date and time for scheduled_time
    const scheduledTime = new Date(`${date}T${time}`);
    
    // Validate the appointment is not in the past
    if (scheduledTime <= new Date()) {
      return new Response(JSON.stringify({ error: 'Cannot book appointments in the past' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the patient already has an appointment at this time
    const { data: patientConflicts, error: patientCheckError } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user.id)
      .eq('scheduled_time', scheduledTime.toISOString())
      .neq('status', 'cancelled');

    if (patientCheckError) {
      console.error('Error checking patient availability:', patientCheckError);
      return new Response(JSON.stringify({ error: 'Unable to verify your availability. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (patientConflicts && patientConflicts.length > 0) {
      return new Response(JSON.stringify({ error: 'You already have an appointment at this time' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if the doctor has existing appointments at this time
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctor_id)
      .eq('scheduled_time', scheduledTime.toISOString())
      .neq('status', 'cancelled');

    if (checkError) {
      console.error('Error checking doctor availability:', checkError);
      return new Response(JSON.stringify({ error: 'Unable to verify doctor availability. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return new Response(JSON.stringify({ error: 'Time slot already taken. Please choose a different time.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the doctor has set availability for this day and time
    const weekday = scheduledTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const appointmentTime = scheduledTime.toTimeString().slice(0, 5); // HH:MM format

    const { data: doctorAvailability, error: availabilityError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctor_id)
      .eq('weekday', weekday)
      .eq('is_available', true);

    if (availabilityError) {
      console.error('Error checking doctor availability schedule:', availabilityError);
      return new Response(JSON.stringify({ error: 'Unable to verify doctor schedule. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the requested time falls within any available slot
    const isTimeAvailable = doctorAvailability && doctorAvailability.some(slot => {
      if (!slot.start_time || !slot.end_time) return false;
      const startTime = slot.start_time;
      const endTime = slot.end_time;
      return appointmentTime >= startTime && appointmentTime < endTime;
    });

    if (!isTimeAvailable) {
      return new Response(JSON.stringify({ error: 'Doctor is not available at this time. Please check the doctor\'s availability and choose a different time slot.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get doctor's consultation fee and verify doctor exists
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('consultation_fee, verification_status')
      .eq('user_id', doctor_id)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor data:', doctorError);
      return new Response(JSON.stringify({ error: 'Doctor not found. Please select a different doctor.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (doctorData.verification_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Doctor not available. Please select a different doctor.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: doctor_id,
        scheduled_time: scheduledTime.toISOString(),
        notes: reason,
        consultation_fee: doctorData?.consultation_fee || 0,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating appointment:', createError);
      // Check if it's a duplicate key error or similar
      if (createError.code === '23505') {
        return new Response(JSON.stringify({ error: 'You already have an appointment at this time' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Unable to book appointment. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      appointment: appointment,
      message: 'Appointment booked successfully! The doctor will review and approve your request.' 
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