import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Zap, 
  RefreshCw,
  PlayCircle,
  Shield
} from "lucide-react";
import { toast } from "sonner";

interface HealthData {
  overall_status: string;
  system_health: any;
  metrics: {
    api_calls: {
      total_24h: number;
      success_rate: number;
      avg_response_time_ms: number;
    };
    ai_performance: {
      avg_confidence: number;
      confidence_pass_rate: number;
      total_sessions_24h: number;
    };
    doctor_activity: {
      total_overrides_24h: number;
      overrides_by_type: Record<string, number>;
    };
  };
  active_alerts: any[];
  recent_performance: any[];
}

export const SystemHealthDashboard = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchHealthData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) return;

      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/system-health-check`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      } else {
        toast.error('Failed to fetch system health data');
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
      toast.error('Error fetching health data');
    } finally {
      setLoading(false);
    }
  };

  const runQATests = async () => {
    if (!user) return;
    
    setRunningTests(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) return;

      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/qa-testing-runner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ runAll: true })
      });

      if (response.ok) {
        const results = await response.json();
        setTestResults(results);
        toast.success(`QA Tests completed: ${results.summary.passed}/${results.summary.total_tests} passed`);
      } else {
        toast.error('Failed to run QA tests');
      }
    } catch (error) {
      console.error('Error running QA tests:', error);
      toast.error('Error running QA tests');
    } finally {
      setRunningTests(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'degraded': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading system health data...
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load system health data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground">Monitor diagnostic system performance and quality</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHealthData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={runQATests} 
            disabled={runningTests}
            className="flex items-center gap-2"
          >
            {runningTests ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Run QA Tests
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(healthData.overall_status)}`}>
              {getStatusIcon(healthData.overall_status)}
              <span className="font-medium capitalize">{healthData.overall_status}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(healthData.timestamp).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <Activity className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{healthData.metrics.api_calls.total_24h}</div>
              <div className="text-sm text-muted-foreground">API Calls (24h)</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{healthData.metrics.api_calls.success_rate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">{Math.round(healthData.metrics.api_calls.avg_response_time_ms)}ms</div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
            
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <Zap className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{healthData.metrics.ai_performance.confidence_pass_rate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">AI Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ai-quality">AI Quality</TabsTrigger>
          <TabsTrigger value="testing">QA Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {healthData.active_alerts.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-muted-foreground">No active alerts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {healthData.active_alerts.map((alert, index) => (
                    <Alert key={index} className={
                      alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      'border-yellow-500 bg-yellow-50'
                    }>
                      <AlertTriangle className="h-4 w-4" />
                      <div className="ml-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{alert.title}</span>
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <AlertDescription>
                          {alert.description}
                        </AlertDescription>
                        <div className="text-xs text-muted-foreground mt-2">
                          Triggered: {new Date(alert.triggered_at).toLocaleString()}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Success Rate</span>
                    <span>{healthData.metrics.api_calls.success_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={healthData.metrics.api_calls.success_rate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Response Time</span>
                    <span>{Math.round(healthData.metrics.api_calls.avg_response_time_ms)}ms</span>
                  </div>
                  <Progress 
                    value={Math.min(100, (5000 - healthData.metrics.api_calls.avg_response_time_ms) / 50)} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Doctor Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Overrides (24h)</span>
                    <span className="font-semibold">{healthData.metrics.doctor_activity.total_overrides_24h}</span>
                  </div>
                  
                  {Object.entries(healthData.metrics.doctor_activity.overrides_by_type).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Diagnosis Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {healthData.metrics.ai_performance.avg_confidence.toFixed(3)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Confidence</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {healthData.metrics.ai_performance.confidence_pass_rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Pass Rate (&gt;70%)</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {healthData.metrics.ai_performance.total_sessions_24h}
                  </div>
                  <div className="text-sm text-muted-foreground">Sessions (24h)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QA Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded">
                      <div className="text-xl font-bold">{testResults.summary.total_tests}</div>
                      <div className="text-sm text-muted-foreground">Total Tests</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-xl font-bold text-green-600">{testResults.summary.passed}</div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 rounded">
                      <div className="text-xl font-bold text-red-600">{testResults.summary.failed}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-xl font-bold text-blue-600">{testResults.summary.success_rate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Last executed: {new Date(testResults.executed_at).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <PlayCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Click "Run QA Tests" to start automated testing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};