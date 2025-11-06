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
    const endpoint = url.pathname.split('/').pop();

    if (action === 'overview' || action === 'dashboard-stats' || endpoint === 'overview') {
      const { timePeriod, startDate, endDate } = body;
      
      // Calculate date range based on timePeriod
      let dateFilter = {};
      const now = new Date();
      
      if (timePeriod === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { gte: monthStart.toISOString() };
      } else if (timePeriod === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateFilter = { gte: yearStart.toISOString() };
      } else if (timePeriod === 'custom' && startDate && endDate) {
        dateFilter = { gte: startDate, lte: endDate };
      }
      
      // Get all users with their details
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('user_id, gender, created_at, country');
      
      // Filter users based on time period for new users count
      const filteredUsers = dateFilter.gte 
        ? allUsers?.filter(u => new Date(u.created_at) >= new Date(dateFilter.gte as string))
        : allUsers;
      
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, verification_status, created_at');

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status, created_at');

      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('id, status');

      const { data: diagnoses } = await supabase
        .from('ai_confidence_logs')
        .select('id, created_at, average_confidence');

      // Calculate stats
      const totalDoctors = doctors?.length || 0;
      const approvedDoctors = doctors?.filter(d => d.verification_status === 'approved').length || 0;
      const pendingDoctors = doctors?.filter(d => d.verification_status === 'pending').length || 0;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const newApplications = doctors?.filter(d => new Date(d.created_at) >= monthStart).length || 0;

      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      
      const totalDiagnoses = diagnoses?.length || 0;
      const diagnosesThisMonth = diagnoses?.filter(d => new Date(d.created_at) >= monthStart).length || 0;
      const avgAIConfidence = diagnoses?.reduce((sum, d) => sum + (d.average_confidence || 0), 0) / (diagnoses?.length || 1) * 100;

      // Gender distribution
      const genderCounts: Record<string, number> = {};
      allUsers?.forEach(user => {
        const gender = user.gender || 'Not Specified';
        genderCounts[gender] = (genderCounts[gender] || 0) + 1;
      });
      
      const genderData = Object.entries(genderCounts).map(([name, value]) => ({
        name,
        value
      }));

      // Country distribution
      const countryCounts: Record<string, number> = {};
      allUsers?.forEach(user => {
        const country = user.country || 'Unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });
      
      const countryData = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // User growth over time (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });
      
      const userGrowthData = last30Days.map(date => {
        const count = allUsers?.filter(u => u.created_at?.split('T')[0] === date).length || 0;
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: count
        };
      });

      const stats = {
        totalUsers: totalUsers || 0,
        newUsersThisMonth: filteredUsers?.length || 0,
        totalDoctors,
        approvedDoctors,
        pendingDoctors,
        newApplications,
        totalAppointments,
        completedAppointments,
        activeSubscriptions,
        totalDiagnoses,
        diagnosesThisMonth,
        avgAIConfidence: avgAIConfidence || 0,
      };

      return new Response(JSON.stringify({ 
        stats, 
        genderData,
        countryData,
        userGrowthData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'ai-logs') {
      const { data: logs, error } = await supabase
        .from('ai_confidence_logs')
        .select(`
          id,
          ai_model,
          highest_confidence,
          average_confidence,
          passed_threshold,
          conditions_analyzed,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedLogs = logs.map(log => ({
        ...log,
        user_name: 'User',
      }));

      const stats = {
        totalDiagnoses: logs.length,
        avgConfidence: logs.length
          ? (logs.reduce((sum, log) => sum + Number(log.average_confidence), 0) / logs.length) * 100
          : 0,
        highConfidence: logs.filter(log => log.passed_threshold).length,
        lowConfidence: logs.filter(log => !log.passed_threshold).length,
      };

      return new Response(JSON.stringify({ logs: formattedLogs, stats }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (endpoint === 'health') {
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