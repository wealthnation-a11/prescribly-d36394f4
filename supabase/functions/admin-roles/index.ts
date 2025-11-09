import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schemas
const assignRoleSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  role: z.enum(['admin', 'doctor', 'patient'], { message: "Invalid role. Must be admin, doctor, or patient" })
});

const removeRoleSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  role: z.enum(['admin', 'doctor', 'patient'], { message: "Invalid role" })
});

const legacyActionSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" })
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: adminCheck, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { method } = req;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Validate action
    if (!action || !['list', 'assign', 'remove', 'grant-legacy', 'revoke-legacy'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - List all user roles
    if (method === "GET" && action === "list") {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select(`
          *,
          profiles:user_id (
            email,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ roles }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Assign role to user
    if (method === "POST" && action === "assign") {
      const body = await req.json();
      
      const validation = assignRoleSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed', 
            details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { userId, role } = validation.data;

      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, role: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Remove role from user
    if (method === "DELETE" && action === "remove") {
      const body = await req.json();
      
      const validation = removeRoleSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed', 
            details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { userId, role } = validation.data;

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Grant legacy status
    if (method === "POST" && action === "grant-legacy") {
      const body = await req.json();
      
      const validation = legacyActionSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed', 
            details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { userId } = validation.data;

      const { error } = await supabase
        .from("profiles")
        .update({ is_legacy: true })
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Revoke legacy status
    if (method === "POST" && action === "revoke-legacy") {
      const body = await req.json();
      
      const validation = legacyActionSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed', 
            details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { userId } = validation.data;

      const { error } = await supabase
        .from("profiles")
        .update({ is_legacy: false })
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
