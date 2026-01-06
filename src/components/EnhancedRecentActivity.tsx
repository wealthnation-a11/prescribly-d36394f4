import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Activity,
  Stethoscope, 
  Pill, 
  Calendar,
  FileText,
  Users,
  Brain,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  icon?: React.ReactNode;
}

const EnhancedRecentActivity = () => {
  const { user } = useAuth();
  const { isDoctor } = useUserRole();
  const [activeTab, setActiveTab] = useState(isDoctor ? 'appointments' : 'diagnostics');

  // Fetch Health Diagnostics for patients
  const { data: diagnostics = [], isLoading: diagnosticsLoading } = useQuery({
    queryKey: ['patient-diagnostics', user?.id],
    queryFn: async () => {
      if (!user?.id || isDoctor) return [];
      
      const activities: ActivityItem[] = [];
      
      // Query user_history for diagnosis activities
      const { data: historyData } = await supabase
        .from('user_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Query user_diagnosis_history for detailed diagnosis records
      const { data: diagnosisHistoryData } = await supabase
        .from('user_diagnosis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Query chat_sessions for AI diagnostic activities
      const { data: chatData } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Add user_history data
      if (historyData) {
        activities.push(...historyData.map(item => ({
          id: item.id,
          title: 'Health Diagnostic Completed',
          description: Array.isArray(item.suggested_conditions) && item.suggested_conditions.length > 0
            ? `AI diagnosis: ${(item.suggested_conditions[0] as any)?.condition || 'Condition analyzed'}`
            : item.input_text || 'Health diagnostic session completed',
          timestamp: item.created_at,
          status: 'completed',
          icon: <Brain className="h-4 w-4 text-purple-600" />
        })));
      }

      // Add user_diagnosis_history data
      if (diagnosisHistoryData) {
        activities.push(...diagnosisHistoryData.map(item => ({
          id: item.id,
          title: 'AI Diagnosis Completed',
          description: item.diagnosis 
            ? `Diagnosis: ${typeof item.diagnosis === 'string' ? item.diagnosis : JSON.stringify(item.diagnosis).substring(0, 50)}`
            : (Array.isArray(item.symptoms) ? item.symptoms.join(', ') : item.symptoms) || 'Health assessment completed',
          timestamp: item.created_at,
          status: 'completed',
          icon: <Brain className="h-4 w-4 text-purple-600" />
        })));
      }

      // Add chat session data
      if (chatData) {
        activities.push(...chatData.map(item => ({
          id: item.id,
          title: 'AI Health Chat Session',
          description: item.confidence_score 
            ? `Interactive diagnosis with confidence: ${(item.confidence_score * 100).toFixed(1)}%`
            : 'AI-powered health consultation',
          timestamp: item.created_at,
          status: item.status || 'completed',
          icon: <Brain className="h-4 w-4 text-purple-600" />
        })));
      }

      // Sort by timestamp, remove duplicates, and limit to 10
      const uniqueActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .filter((activity, index, self) => 
          index === self.findIndex(a => a.id === activity.id)
        )
        .slice(0, 10);

      return uniqueActivities;
    },
    enabled: !!user?.id && !isDoctor,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch Prescriptions for patients
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['patient-prescriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const column = isDoctor ? 'doctor_id' : 'patient_id';
      
      // Try patient_prescriptions table first
      const { data: patientPrescData, error: patientPrescError } = await supabase
        .from('patient_prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!patientPrescError && patientPrescData?.length > 0) {
        return patientPrescData.map(item => ({
          id: item.id,
          title: 'Prescription Received',
          description: item.diagnosis ? 
            `${typeof item.diagnosis === 'object' ? JSON.stringify(item.diagnosis) : item.diagnosis}` : 
            'Medical prescription generated',
          timestamp: item.created_at,
          status: item.status || 'active',
          icon: <Pill className="h-4 w-4 text-green-600" />
        }));
      }

      // Fallback to prescriptions_v2 table
      const { data, error } = await supabase
        .from('prescriptions_v2')
        .select('*')
        .eq(column, user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching prescriptions:', error);
        return [];
      }
      
      return (data || []).map(item => ({
        id: item.id,
        title: isDoctor ? 'Prescription Written' : 'Prescription Received',
        description: item.diagnosis_id || (Array.isArray(item.drugs) ? (item.drugs as any[]).join(', ') : 'Medical prescription'),
        timestamp: item.created_at,
        status: item.status || 'active',
        icon: <Pill className="h-4 w-4 text-green-600" />
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch Appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['user-appointments', user?.id, isDoctor],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const column = isDoctor ? 'doctor_id' : 'patient_id';
      const otherColumn = isDoctor ? 'patient_id' : 'doctor_id';
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq(column, user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }

      // Get profiles for the other person in each appointment
      const appointmentsWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', item[otherColumn])
            .maybeSingle();

          const otherPersonName = profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : isDoctor ? 'Patient' : 'Doctor';
            
          return {
            id: item.id,
            title: isDoctor ? 'Appointment Scheduled' : 'Appointment Booked',
            description: `${item.notes || 'Consultation'} - ${format(new Date(item.scheduled_time), 'MMM dd, yyyy')}${otherPersonName !== 'Patient' && otherPersonName !== 'Doctor' ? ` with ${otherPersonName}` : ''}`,
            timestamp: item.created_at,
            status: item.status,
            icon: <Calendar className="h-4 w-4 text-blue-600" />
          };
        })
      );

      return appointmentsWithProfiles;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch Doctor-specific data
  const { data: patientConsultations = [], isLoading: consultationsLoading } = useQuery({
    queryKey: ['doctor-consultations', user?.id],
    queryFn: async () => {
      if (!user?.id || !isDoctor) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching consultations:', error);
        return [];
      }

      // Get patient profiles for completed consultations
      const consultationsWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', item.patient_id)
            .maybeSingle();

          const patientName = profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : 'Patient';
            
          return {
            id: item.id,
            title: 'Patient Consultation',
            description: `Consultation with ${patientName} completed`,
            timestamp: item.updated_at,
            status: 'completed',
            icon: <Users className="h-4 w-4 text-teal-600" />
          };
        })
      );

      return consultationsWithProfiles;
    },
    enabled: !!user?.id && isDoctor,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'cancelled':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const ActivityList = ({ items, isLoading }: { items: ActivityItem[], isLoading: boolean }) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 p-2 rounded-full bg-muted">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  {item.status && (
                    <Badge className={`${getStatusColor(item.status)} text-xs flex items-center gap-1`}>
                      {getStatusIcon(item.status)}
                      {item.status}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.timestamp), 'MMM dd, yyyy • h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const patientTabs = [
    {
      value: 'diagnostics',
      label: 'Health Diagnostics',
      icon: <Stethoscope className="h-4 w-4" />,
      count: diagnostics.length,
      content: <ActivityList items={diagnostics} isLoading={diagnosticsLoading} />
    },
    {
      value: 'prescriptions',
      label: 'Prescriptions',
      icon: <Pill className="h-4 w-4" />,
      count: prescriptions.length,
      content: <ActivityList items={prescriptions} isLoading={prescriptionsLoading} />
    },
    {
      value: 'appointments',
      label: 'Appointments',
      icon: <Calendar className="h-4 w-4" />,
      count: appointments.length,
      content: <ActivityList items={appointments} isLoading={appointmentsLoading} />
    }
  ];

  const doctorTabs = [
    {
      value: 'appointments',
      label: 'Appointments',
      icon: <Calendar className="h-4 w-4" />,
      count: appointments.length,
      content: <ActivityList items={appointments} isLoading={appointmentsLoading} />
    },
    {
      value: 'prescriptions',
      label: 'Prescriptions Written',
      icon: <FileText className="h-4 w-4" />,
      count: prescriptions.length,
      content: <ActivityList items={prescriptions} isLoading={prescriptionsLoading} />
    },
    {
      value: 'consultations',
      label: 'Patient Consultations',
      icon: <Users className="h-4 w-4" />,
      count: patientConsultations.length,
      content: <ActivityList items={patientConsultations} isLoading={consultationsLoading} />
    }
  ];

  const tabs = isDoctor ? doctorTabs : patientTabs;

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-6 mb-4">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex items-center gap-2 text-xs font-medium"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {tab.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="flex-1 overflow-hidden px-6 pb-6">
            {tabs.map((tab) => (
              <TabsContent 
                key={tab.value} 
                value={tab.value} 
                className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
              >
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedRecentActivity;