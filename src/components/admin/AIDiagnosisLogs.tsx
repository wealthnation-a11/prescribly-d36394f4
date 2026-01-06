import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { useEffect, useState } from "react";

interface AILog {
  id: string;
  user_name: string;
  user_id?: string;
  ai_model: string;
  highest_confidence: number;
  average_confidence: number;
  passed_threshold: boolean;
  conditions_analyzed: any;
  created_at: string;
  type?: 'confidence_log' | 'chat_session' | 'diagnosis_history';
  symptoms?: string[];
  diagnosis?: string;
  status?: string;
}

const AIDiagnosisLogs = () => {
  const [realTimeUpdate, setRealTimeUpdate] = useState(0);
  
  const { data: logsData, isLoading } = useQuery({
    queryKey: ["admin-ai-logs", realTimeUpdate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "ai-logs" },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Real-time subscription for new AI diagnosis logs
  useEffect(() => {
    const channel = supabase
      .channel('ai-diagnosis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_confidence_logs'
        },
        () => {
          setRealTimeUpdate(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return <div className="text-center py-8">Loading AI diagnosis logs...</div>;
  }

  const { logs = [], stats = {} } = logsData || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Diagnosis Logs</h2>
        <Badge variant="outline" className="animate-pulse">
          <Activity className="h-3 w-3 mr-1" />
          Live Updates
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Diagnoses</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDiagnoses || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConfidence?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.highConfidence || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Confidence</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowConfidence || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <Brain className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.chatSessions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">History Records</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.historyRecords || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>AI Model</TableHead>
              <TableHead>Highest Confidence</TableHead>
              <TableHead>Avg Confidence</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: AILog) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.user_name}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                      log.type === 'chat_session' 
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                        : log.type === 'diagnosis_history'
                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                        : 'bg-gray-500/10 text-gray-600 border-gray-500/30'
                    }
                  >
                    {log.type === 'chat_session' ? 'Chat' : log.type === 'diagnosis_history' ? 'History' : 'Log'}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.ai_model}</TableCell>
                <TableCell>
                  <Badge variant={log.highest_confidence > 0.7 ? "default" : "secondary"}>
                    {(log.highest_confidence * 100).toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell>{(log.average_confidence * 100).toFixed(1)}%</TableCell>
                <TableCell>
                  {log.passed_threshold ? (
                    <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">Passed</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {log.diagnosis 
                    ? log.diagnosis 
                    : log.symptoms 
                    ? (Array.isArray(log.symptoms) ? log.symptoms.join(', ') : log.symptoms)
                    : JSON.stringify(log.conditions_analyzed).substring(0, 50)}...
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AIDiagnosisLogs;
