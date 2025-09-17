import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora RTC Token Generator (simplified implementation)
class AgoraToken {
  static generateToken(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: string,
    role: number = 1, // 1 for Publisher, 2 for Subscriber
    expireTime: number = 3600 // 1 hour default
  ): string {
    // This is a simplified token generation
    // In production, use the official Agora token generation library
    const now = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = now + expireTime;
    
    // Create a simple token format for demo purposes
    // In production, implement proper Agora token generation
    const tokenData = {
      appId,
      channelName,
      uid,
      role,
      expireTime: privilegeExpiredTs,
      timestamp: now
    };
    
    // Simple base64 encoding for demo (use proper Agora algorithm in production)
    return btoa(JSON.stringify(tokenData));
  }
}

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

    // In a real implementation, you would:
    // 1. Verify the appointment exists and user has access
    // 2. Get Agora credentials from environment
    // 3. Generate proper Agora token

    const appId = Deno.env.get('AGORA_APP_ID') || 'demo_app_id';
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE') || 'demo_certificate';
    
    // Use appointment ID as channel name to ensure unique channels per appointment
    const channelName = `appointment_${appointmentId}`;
    const userRole = role || 1; // 1 = publisher (can send audio/video), 2 = subscriber
    const expireTime = 3600; // 1 hour

    const token = AgoraToken.generateToken(
      appId,
      appCertificate,
      channelName,
      userId,
      userRole,
      expireTime
    );

    return new Response(JSON.stringify({
      token,
      channelName,
      appId,
      uid: userId,
      expiresAt: Math.floor(Date.now() / 1000) + expireTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating Agora token:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate token' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});