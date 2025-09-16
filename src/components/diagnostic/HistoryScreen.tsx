import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  History, 
  Calendar, 
  TrendingUp, 
  FileText, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Brain,
  Pill
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface HistoryScreenProps {
  onStartNew: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onStartNew
}) => {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load diagnosis history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Load from analytics_events since diagnosis_history doesn't exist
        const { data, error } = await supabase
          .from('analytics_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_type', 'diagnosis_completed')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setHistoryData(data || []);
      } catch (error) {
        console.error('Error loading history:', error);
        toast.error('Failed to load diagnosis history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'bg-green-500';
    if (probability >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProbabilityLabel = (probability: number) => {
    if (probability >= 0.7) return 'High Confidence';
    if (probability >= 0.4) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg text-muted-foreground">Loading your diagnosis history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <History className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Diagnosis History</h2>
        <p className="text-muted-foreground text-lg">
          Your previous AI health assessments and diagnoses
        </p>
      </motion.div>

      {/* Stats Summary */}
      {historyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {historyData.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Diagnoses
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {Math.round(historyData.reduce((sum, item) => sum + ((item.payload?.probability || 0)), 0) / historyData.length * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Average Confidence
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {historyData.length > 0 ? format(new Date(historyData[0].created_at), 'MMM dd') : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                Last Assessment
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History List */}
      {historyData.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Diagnosis History</h3>
            <p className="text-muted-foreground mb-6">
              You haven't completed any health assessments yet.
            </p>
            <Button onClick={onStartNew}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Start Your First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {historyData.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const payload = item.payload || {};
            const symptoms = payload.symptoms || [];
            const answers = payload.answers || {};
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="cursor-pointer" onClick={() => toggleExpanded(item.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM dd, yyyy - HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`${getProbabilityColor(payload.probability || 0)} text-white`}
                        >
                          {Math.round((payload.probability || 0) * 100)}%
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <h3 className="text-xl font-semibold">
                        {payload.condition_name || 'Unknown Condition'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Analysis completed
                      </p>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t">
                      <div className="space-y-4">
                        {/* Confidence Level */}
                        <div>
                          <h4 className="font-medium mb-2">Confidence Level</h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getProbabilityColor(payload.probability || 0)}`}
                                style={{ width: `${(payload.probability || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {getProbabilityLabel(payload.probability || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Symptoms */}
                        {symptoms.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Reported Symptoms</h4>
                            <div className="flex flex-wrap gap-2">
                              {symptoms.map((symptom: string, index: number) => (
                                <Badge key={index} variant="outline">
                                  {symptom}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Key Answers */}
                        {Object.keys(answers).length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Key Information</h4>
                            <div className="space-y-2 text-sm">
                              {Object.entries(answers).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="font-medium">{value as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Session Info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Session ID: {payload.session_id?.slice(0, 8)}...</span>
                          <span>Assessment #{historyData.indexOf(item) + 1}</span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-6">
        <Button onClick={onStartNew} size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          New Health Assessment
        </Button>
      </div>
    </div>
  );
};