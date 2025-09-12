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

    // Authentication check for admin access
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (!profile || profile.role !== 'admin') {
          return new Response(
            JSON.stringify({ error: 'Admin access required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Run system health check
    const { data: healthData } = await supabase.rpc('check_system_health');

    // Get additional metrics
    const [
      apiCallsData,
      performanceData,
      activeAlertsData,
      aiConfidenceData,
      doctorOverridesData
    ] = await Promise.all([
      // API calls in last 24 hours
      supabase
        .from('monitoring_logs')
        .select('success, latency_ms, created_at')
        .eq('event_type', 'api_call')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

      // Performance metrics
      supabase
        .from('performance_metrics')
        .select('metric_type, value, unit, measured_at')
        .gte('measured_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('measured_at', { ascending: false })
        .limit(100),

      // Active alerts
      supabase
        .from('system_alerts')
        .select('*')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false }),

      // AI confidence stats
      supabase
        .from('ai_confidence_logs')
        .select('highest_confidence, passed_threshold, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

      // Doctor overrides
      supabase
        .from('doctor_overrides')
        .select('override_type, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Calculate additional metrics
    const apiCalls = apiCallsData.data || [];
    const totalApiCalls = apiCalls.length;
    const successfulCalls = apiCalls.filter(call => call.success).length;
    const successRate = totalApiCalls > 0 ? (successfulCalls / totalApiCalls) * 100 : 0;

    const avgResponseTime = apiCalls.length > 0 
      ? apiCalls
          .filter(call => call.latency_ms)
          .reduce((sum, call) => sum + call.latency_ms, 0) / apiCalls.filter(call => call.latency_ms).length
      : 0;

    const aiConfidenceStats = aiConfidenceData.data || [];
    const avgConfidence = aiConfidenceStats.length > 0
      ? aiConfidenceStats.reduce((sum, log) => sum + parseFloat(log.highest_confidence), 0) / aiConfidenceStats.length
      : 0;

    const confidencePassRate = aiConfidenceStats.length > 0
      ? (aiConfidenceStats.filter(log => log.passed_threshold).length / aiConfidenceStats.length) * 100
      : 0;

    const doctorOverrides = doctorOverridesData.data || [];
    const overridesByType = doctorOverrides.reduce((acc, override) => {
      acc[override.override_type] = (acc[override.override_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Log daily counts
    await supabase
      .from('performance_metrics')
      .insert([
        {
          metric_type: 'daily_counts',
          endpoint: 'system_health',
          value: totalApiCalls,
          unit: 'count',
          metadata: {
            type: 'api_calls_24h',
            success_rate: successRate
          }
        },
        {
          metric_type: 'daily_counts',
          endpoint: 'ai_confidence',
          value: confidencePassRate,
          unit: 'percentage',
          metadata: {
            type: 'confidence_pass_rate_24h',
            total_sessions: aiConfidenceStats.length
          }
        }
      ]);

    const healthReport = {
      timestamp: new Date().toISOString(),
      overall_status: getOverallStatus(healthData, activeAlertsData.data || []),
      system_health: healthData,
      metrics: {
        api_calls: {
          total_24h: totalApiCalls,
          success_rate: successRate,
          avg_response_time_ms: avgResponseTime
        },
        ai_performance: {
          avg_confidence: avgConfidence,
          confidence_pass_rate: confidencePassRate,
          total_sessions_24h: aiConfidenceStats.length
        },
        doctor_activity: {
          total_overrides_24h: doctorOverrides.length,
          overrides_by_type: overridesByType
        }
      },
      active_alerts: activeAlertsData.data || [],
      recent_performance: performanceData.data || []
    };

    return new Response(
      JSON.stringify(healthReport),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in system-health-check:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Health check failed',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getOverallStatus(healthData: any, activeAlerts: any[]): string {
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical').length;
  const highAlerts = activeAlerts.filter(alert => alert.severity === 'high').length;
  
  if (criticalAlerts > 0) return 'critical';
  if (highAlerts > 0) return 'degraded';
  if (activeAlerts.length > 0) return 'warning';
  
  const errorRate = healthData?.error_rate_percent || 0;
  const rejectionRate = healthData?.rejection_rate_percent || 0;
  const responseTime = healthData?.avg_response_time_ms || 0;
  
  if (errorRate > 10 || rejectionRate > 75 || responseTime > 10000) return 'critical';
  if (errorRate > 5 || rejectionRate > 50 || responseTime > 5000) return 'warning';
  
  return 'healthy';
}