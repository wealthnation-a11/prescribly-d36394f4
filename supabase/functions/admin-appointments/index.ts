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

    // Verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const method = req.method;
    const body = method !== 'GET' ? await req.json() : {};
    const { action } = body;
    const appointmentId = url.pathname.split('/').pop();

    if ((method === 'POST' && action === 'list') || (method === 'GET' && !appointmentId)) {
      // Get all appointments with filtering
      const status = url.searchParams.get('status');
      const dateFrom = url.searchParams.get('date_from');
      const dateTo = url.searchParams.get('date_to');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('appointments')
        .select(`
          id, scheduled_time, status, consultation_fee, duration_minutes, notes, created_at,
          patient:patient_id(id, first_name, last_name, email),
          doctor:doctor_id(id, first_name, last_name, email)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('scheduled_time', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (dateFrom) {
        query = query.gte('scheduled_time', dateFrom);
      }

      if (dateTo) {
        query = query.lte('scheduled_time', dateTo);
      }

      const { data: appointments, error, count } = await query;

      if (error) throw error;

      // Get summary stats
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('status, scheduled_time, consultation_fee');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const stats = {
        total: allAppointments?.length || 0,
        pending: allAppointments?.filter(a => a.status === 'pending').length || 0,
        approved: allAppointments?.filter(a => a.status === 'approved').length || 0,
        completed: allAppointments?.filter(a => a.status === 'completed').length || 0,
        cancelled: allAppointments?.filter(a => a.status === 'cancelled').length || 0,
        today: allAppointments?.filter(a => {
          const aptDate = new Date(a.scheduled_time);
          return aptDate >= today && aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
        }).length || 0,
        total_revenue: allAppointments
          ?.filter(a => a.status === 'completed')
          .reduce((sum, a) => sum + (parseFloat(a.consultation_fee) || 0), 0) || 0
      };

      return new Response(JSON.stringify({
        appointments,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        stats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'PUT' && appointmentId) {
      // Update appointment status
      const body = await req.json();
      const { status, notes } = body;

      const { data: updatedAppointment, error } = await supabase
        .from('appointments')
        .update({ 
          status,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select(`
          id, status, scheduled_time,
          patient:patient_id(first_name, last_name, email),
          doctor:doctor_id(first_name, last_name, email)
        `)
        .single();

      if (error) throw error;

      // Create notification for patient and doctor
      const notificationMessage = `Your appointment has been ${status} by admin.${notes ? ` Note: ${notes}` : ''}`;
      
      await Promise.all([
        // Notify patient
        supabase.from('notifications').insert({
          user_id: updatedAppointment.patient.id,
          type: 'appointment_status',
          title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: notificationMessage,
          data: { appointment_id: appointmentId, status, admin_notes: notes }
        }),
        // Notify doctor
        supabase.from('notifications').insert({
          user_id: updatedAppointment.doctor.id,
          type: 'appointment_status',
          title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: notificationMessage,
          data: { appointment_id: appointmentId, status, admin_notes: notes }
        })
      ]);

      return new Response(JSON.stringify({
        success: true,
        appointment: updatedAppointment,
        message: `Appointment ${status} successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in admin-appointments:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});