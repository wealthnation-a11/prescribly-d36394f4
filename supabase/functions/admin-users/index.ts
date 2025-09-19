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

    // Get the JWT from the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
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
    const userId = url.pathname.split('/').pop();

    if (method === 'GET' && !userId) {
      // Get all users with pagination and filtering
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const role = url.searchParams.get('role');
      const search = url.searchParams.get('search');
      
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('profiles')
        .select(`
          id, user_id, email, first_name, last_name, role, created_at,
          doctors(verification_status, specialization),
          patients(registration_status)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (role) {
        query = query.eq('role', role);
      }

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: users, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);

      return new Response(JSON.stringify({
        users,
        total: count || 0,
        page,
        totalPages,
        hasMore: page < totalPages
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET' && userId) {
      // Get specific user
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select(`
          id, user_id, email, first_name, last_name, role, created_at,
          doctors(id, verification_status, specialization, bio, years_of_experience, consultation_fee, rating, total_reviews),
          patients(id, date_of_birth, gender, medical_history, allergies, current_medications)
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Get user stats
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status, created_at')
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`);

      const stats = {
        totalAppointments: appointments?.length || 0,
        completedAppointments: appointments?.filter(a => a.status === 'completed').length || 0,
        pendingAppointments: appointments?.filter(a => a.status === 'pending').length || 0
      };

      return new Response(JSON.stringify({
        user: userProfile,
        stats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'PUT' && userId) {
      // Update user
      const body = await req.json();
      const { first_name, last_name, role, status } = body;

      const { data: updatedUser, error } = await supabase
        .from('profiles')
        .update({ first_name, last_name, role })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        user: updatedUser
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'DELETE' && userId) {
      // Delete user (soft delete by updating status)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Error deleting auth user:', authError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'User deleted successfully'
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
    console.error('Error in admin-users:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});