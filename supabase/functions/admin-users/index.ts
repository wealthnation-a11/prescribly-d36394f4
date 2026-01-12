import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const paginationSchema = z.object({
  page: z.union([z.string(), z.number()]).optional().transform(val => typeof val === 'string' ? parseInt(val) : val).pipe(z.number().int().positive()).optional(),
  limit: z.union([z.string(), z.number()]).optional().transform(val => typeof val === 'string' ? parseInt(val) : val).pipe(z.number().int().min(1).max(100)).optional(),
  role: z.enum(['admin', 'doctor', 'patient']).optional(),
  search: z.string().max(200).optional()
});

const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'doctor', 'patient']).optional()
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
    const body = method !== 'GET' ? await req.json() : {};
    const { action, userId, search } = body;
    const urlUserId = url.pathname.split('/').pop();

    // Validate UUID if provided
    if (urlUserId && urlUserId !== 'admin-users') {
      const uuidSchema = z.string().uuid();
      const validation = uuidSchema.safeParse(urlUserId);
      if (!validation.success) {
        return new Response(JSON.stringify({ error: 'Invalid user ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if ((method === 'POST' && action === 'list') || (method === 'GET' && !urlUserId)) {
      // Validate pagination parameters
      const paginationData = {
        page: url.searchParams.get('page') || body.page,
        limit: url.searchParams.get('limit') || body.limit,
        role: url.searchParams.get('role') || body.role,
        search: url.searchParams.get('search') || search
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

      const validatedData = validation.data;
      const page = validatedData.page || 1;
      const limit = validatedData.limit || 50;
      const role = validatedData.role;
      const searchQuery = validatedData.search;
      
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('profiles')
        .select(`
          user_id, email, first_name, last_name, role, is_legacy, created_at
        `, { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (role) {
        query = query.eq('role', role);
      }

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
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

    } else if ((action === 'suspend' || action === 'activate') && userId) {
      // Admin can update user status
      return new Response(
        JSON.stringify({ success: true, message: `User ${action}d successfully` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'grant-full-access' && userId) {
      // Grant full access (legacy status) to user
      const uuidSchema = z.string().uuid();
      const validation = uuidSchema.safeParse(userId);
      if (!validation.success) {
        return new Response(JSON.stringify({ error: 'Invalid user ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_legacy: true })
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Full access granted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'revoke-full-access' && userId) {
      // Revoke full access (legacy status) from user
      const uuidSchema = z.string().uuid();
      const validation = uuidSchema.safeParse(userId);
      if (!validation.success) {
        return new Response(JSON.stringify({ error: 'Invalid user ID format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_legacy: false })
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Full access revoked successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (method === 'GET' && urlUserId) {
      // Get specific user
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select(`
          id, user_id, email, first_name, last_name, role, created_at,
          doctors(id, verification_status, specialization, bio, years_of_experience, consultation_fee, rating, total_reviews),
          patients(id, date_of_birth, gender, medical_history, allergies, current_medications)
        `)
        .eq('user_id', urlUserId)
        .single();

      if (error) throw error;

      // Get user stats
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status, created_at')
        .or(`patient_id.eq.${urlUserId},doctor_id.eq.${urlUserId}`);

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

    } else if (method === 'PUT' && urlUserId) {
      // Update user
      const { first_name, last_name, role, status } = body;

      const { data: updatedUser, error } = await supabase
        .from('profiles')
        .update({ first_name, last_name, role })
        .eq('user_id', urlUserId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        user: updatedUser
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (method === 'DELETE' && urlUserId) {
      // Delete user (soft delete by updating status)
      const { error: authError } = await supabase.auth.admin.deleteUser(urlUserId);
      
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