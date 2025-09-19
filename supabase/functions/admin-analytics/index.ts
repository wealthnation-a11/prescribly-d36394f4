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
    const endpoint = url.pathname.split('/').pop();

    if (endpoint === 'health') {
      // System health metrics
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Error rate calculation
      const { data: monitoringLogs } = await supabase
        .from('monitoring_logs')
        .select('success, created_at')
        .gte('created_at', oneHourAgo.toISOString());

      const totalRequests = monitoringLogs?.length || 0;
      const errorCount = monitoringLogs?.filter(log => !log.success).length || 0;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

      // Active users (users who had activity in last 24h)
      const { count: activeUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact' })
        .gte('created_at', oneDayAgo.toISOString());

      // Recent alerts
      const { data: alerts } = await supabase
        .from('emergency_flags')
        .select('id, flag_type, severity_level, description, created_at')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Average response time
      const { data: responseTimes } = await supabase
        .from('monitoring_logs')
        .select('latency_ms')
        .not('latency_ms', 'is', null)
        .gte('created_at', oneHourAgo.toISOString());

      const avgResponseTime = responseTimes?.length > 0 
        ? responseTimes.reduce((sum, log) => sum + log.latency_ms, 0) / responseTimes.length 
        : 0;

      return new Response(JSON.stringify({
        error_rate: parseFloat(errorRate.toFixed(2)),
        response_time: Math.round(avgResponseTime),
        active_users: activeUsers || 0,
        total_requests_last_hour: totalRequests,
        alerts: alerts || [],
        status: errorRate > 5 ? 'warning' : 'healthy',
        last_updated: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (endpoint === 'usage') {
      // Usage statistics
      const period = url.searchParams.get('period') || 'week';
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Daily active users
      const { data: dailyUsers } = await supabase
        .from('analytics_events')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Group by day
      const dailyStats = {};
      dailyUsers?.forEach(event => {
        const day = event.created_at.split('T')[0];
        dailyStats[day] = (dailyStats[day] || 0) + 1;
      });

      // Appointments per day
      const { data: appointments } = await supabase
        .from('appointments')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString());

      const appointmentStats = {};
      appointments?.forEach(apt => {
        const day = apt.created_at.split('T')[0];
        if (!appointmentStats[day]) appointmentStats[day] = 0;
        appointmentStats[day]++;
      });

      // Diagnosis requests
      const { data: diagnosisSessions } = await supabase
        .from('chat_sessions')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      const diagnosisStats = {};
      diagnosisSessions?.forEach(session => {
        const day = session.created_at.split('T')[0];
        if (!diagnosisStats[day]) diagnosisStats[day] = 0;
        diagnosisStats[day]++;
      });

      return new Response(JSON.stringify({
        period,
        daily_users: dailyStats,
        appointments_per_day: appointmentStats,
        diagnosis_requests: diagnosisStats,
        summary: {
          total_appointments: appointments?.length || 0,
          total_users_active: Object.keys(dailyStats).length,
          total_diagnosis_requests: diagnosisSessions?.length || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (endpoint === 'ai-performance') {
      // AI Performance metrics
      const { data: aiLogs } = await supabase
        .from('ai_confidence_logs')
        .select('average_confidence, highest_confidence, passed_threshold, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data: doctorOverrides } = await supabase
        .from('doctor_overrides')
        .select('override_type, confidence_before, confidence_after, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const totalSessions = aiLogs?.length || 0;
      const passedThreshold = aiLogs?.filter(log => log.passed_threshold).length || 0;
      const accuracyRate = totalSessions > 0 ? (passedThreshold / totalSessions) * 100 : 0;

      const avgConfidence = aiLogs?.length > 0 
        ? aiLogs.reduce((sum, log) => sum + log.average_confidence, 0) / aiLogs.length 
        : 0;

      const overrideRate = doctorOverrides && totalSessions > 0 
        ? (doctorOverrides.length / totalSessions) * 100 
        : 0;

      return new Response(JSON.stringify({
        accuracy_rate: parseFloat(accuracyRate.toFixed(2)),
        average_confidence: parseFloat(avgConfidence.toFixed(2)),
        override_rate: parseFloat(overrideRate.toFixed(2)),
        total_ai_sessions: totalSessions,
        sessions_passed_threshold: passedThreshold,
        recent_overrides: doctorOverrides?.slice(0, 10) || [],
        confidence_distribution: {
          high: aiLogs?.filter(log => log.average_confidence > 0.8).length || 0,
          medium: aiLogs?.filter(log => log.average_confidence > 0.6 && log.average_confidence <= 0.8).length || 0,
          low: aiLogs?.filter(log => log.average_confidence <= 0.6).length || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in admin-analytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});