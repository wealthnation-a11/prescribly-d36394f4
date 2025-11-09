import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const doctorVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected'], { message: "Status must be 'approved' or 'rejected'" }),
  notes: z.string().max(1000, "Notes too long").optional()
});

const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1).pipe(z.number().int().positive()),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20).pipe(z.number().int().min(1).max(100)),
  status: z.enum(['pending', 'approved', 'rejected']).optional()
});

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
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Check if this is a specific doctor action
    const isSpecificDoctorRequest = pathParts.length > 2;
    const doctorId = isSpecificDoctorRequest ? pathParts[pathParts.length - 2] : null;
    const action = isSpecificDoctorRequest ? pathParts[pathParts.length - 1] : null;

    // Validate doctor ID if present
    if (doctorId) {
      const uuidSchema = z.string().uuid();
      const validation = uuidSchema.safeParse(doctorId);
      if (!validation.success) {
        return new Response(JSON.stringify({ error: 'Invalid doctor ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (method === 'GET' && !isSpecificDoctorRequest) {
      // Validate pagination parameters
      const paginationData = {
        status: url.searchParams.get('status'),
        page: url.searchParams.get('page'),
        limit: url.searchParams.get('limit')
      };

      const validation = paginationSchema.safeParse(paginationData);
      if (!validation.success) {
        return new Response(JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { status, page, limit } = validation.data;
      
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('doctors')
        .select(`
          id, user_id, specialization, license_number, years_of_experience, 
          consultation_fee, verification_status, bio, rating, total_reviews, created_at
        `, { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('verification_status', status);
      }

      const { data: doctors, error, count } = await query;

      if (error) throw error;

      // Fetch profile data separately for each doctor
      const doctorsWithProfiles = await Promise.all(
        (doctors || []).map(async (doctor) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', doctor.user_id)
            .maybeSingle();
          
          return {
            ...doctor,
            profiles: profile || { first_name: '', last_name: '', email: '' }
          };
        })
      );

      // Get pending verification count
      const { count: pendingCount } = await supabase
        .from('doctors')
        .select('id', { count: 'exact' })
        .eq('verification_status', 'pending');

      return new Response(JSON.stringify({
        doctors: doctorsWithProfiles,
        total: count || 0,
        pending_verification: pendingCount || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'POST' && action === 'verify') {
      // Approve/Reject doctor
      const body = await req.json();
      const { action: verificationAction, notes } = body;

      const status = verificationAction === 'approve' ? 'approved' : 'rejected';

      const { data: updatedDoctor, error } = await supabase
        .from('doctors')
        .update({ 
          verification_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', doctorId)
        .select('id, user_id, verification_status')
        .single();

      if (error) throw error;

      // Fetch profile data separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', updatedDoctor.user_id)
        .maybeSingle();
      
      const doctorWithProfile = {
        ...updatedDoctor,
        profiles: profile || { first_name: '', last_name: '', email: '' }
      };

      // Create audit log
      await supabase.from('doctor_verification_audit').insert({
        doctor_id: doctorId,
        admin_id: user.id,
        action: status === 'approved' ? 'approved' : 'rejected',
        notes: notes || null
      });

      // Create notification for doctor
      await supabase.from('notifications').insert({
        user_id: doctorWithProfile.user_id,
        type: 'doctor_verification',
        title: `Application ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: status === 'approved' 
          ? 'Congratulations! Your doctor application has been approved.' 
          : `Your doctor application has been rejected. ${notes || ''}`,
        data: { verification_status: status, admin_notes: notes }
      });

      console.log(`Admin ${user.id} ${status} doctor ${doctorId}`);

      return new Response(JSON.stringify({
        success: true,
        doctor: doctorWithProfile,
        message: `Doctor ${verificationAction}d successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET' && action === 'stats' && doctorId) {
      // Get doctor stats
      const { data: doctor } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('id', doctorId)
        .single();

      if (!doctor) {
        return new Response(JSON.stringify({ error: 'Doctor not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get appointments stats
      const { data: appointments } = await supabase
        .from('appointments')
        .select('status, consultation_fee, created_at')
        .eq('doctor_id', doctor.user_id);

      // Get call logs for earnings
      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('doctor_earnings, call_date')
        .eq('doctor_id', doctor.user_id);

      const totalEarnings = callLogs?.reduce((sum, log) => sum + (log.doctor_earnings || 0), 0) || 0;
      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;

      const stats = {
        earnings: {
          total: totalEarnings,
          thisMonth: callLogs?.filter(log => {
            const logDate = new Date(log.call_date);
            const now = new Date();
            return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
          }).reduce((sum, log) => sum + (log.doctor_earnings || 0), 0) || 0
        },
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          pending: appointments?.filter(a => a.status === 'pending').length || 0,
          cancelled: appointments?.filter(a => a.status === 'cancelled').length || 0
        }
      };

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in admin-doctors:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});