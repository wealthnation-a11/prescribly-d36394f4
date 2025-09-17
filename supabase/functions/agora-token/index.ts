import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "https://deno.land/x/agora_token@1.0.0/mod.ts";

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
    const { appointmentId, userId, role } = await req.json();

    if (!appointmentId || !userId) {
      throw new Error('appointmentId and userId are required');
    }

    // Get Agora credentials from Supabase secrets
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    // Use appointment ID as channel name to ensure unique channels per appointment
    const channelName = `appointment_${appointmentId}`;
    const userRole = role === 2 ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate proper Agora token using official library
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      parseInt(userId),
      userRole,
      privilegeExpiredTs
    );

    console.log(`Generated Agora token for appointment: ${appointmentId}, user: ${userId}`);

    return new Response(JSON.stringify({
      token,
      channelName,
      appId,
      uid: parseInt(userId),
      expiresAt: privilegeExpiredTs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating Agora token:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate token',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});