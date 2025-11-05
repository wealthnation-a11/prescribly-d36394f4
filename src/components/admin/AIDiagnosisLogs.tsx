import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, AlertTriangle, CheckCircle, Activity } from "lucide-react";

interface AILog {
  id: string;
  user_name: string;
  ai_model: string;
  highest_confidence: number;
  average_confidence: number;
  passed_threshold: boolean;
  conditions_analyzed: any;
  created_at: string;
}

const AIDiagnosisLogs = () => {
  const { data: logsData, isLoading } = useQuery({
    queryKey: ["admin-ai-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "ai-logs" },
      });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading AI diagnosis logs...</div>;
  }

  const { logs = [], stats = {} } = logsData || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highConfidence || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Confidence</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowConfidence || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>AI Model</TableHead>
              <TableHead>Highest Confidence</TableHead>
              <TableHead>Avg Confidence</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: AILog) => (
              <TableRow key={log.id}>
                <TableCell>{log.user_name}</TableCell>
                <TableCell className="font-mono text-xs">{log.ai_model}</TableCell>
                <TableCell>
                  <Badge variant={log.highest_confidence > 0.7 ? "default" : "secondary"}>
                    {(log.highest_confidence * 100).toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell>{(log.average_confidence * 100).toFixed(1)}%</TableCell>
                <TableCell>
                  {log.passed_threshold ? (
                    <Badge variant="default">Passed</Badge>
                  ) : (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {JSON.stringify(log.conditions_analyzed).substring(0, 50)}...
                </TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AIDiagnosisLogs;
