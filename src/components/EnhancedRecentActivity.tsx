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
      
      const { data, error } = await supabase
        .from('diagnosis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: 'Health Diagnostic Completed',
        description: `AI diagnosis session with probability: ${(item.probability * 100).toFixed(1)}%`,
        timestamp: item.created_at,
        status: 'completed',
        icon: <Brain className="h-4 w-4 text-purple-600" />
      }));
    },
    enabled: !!user?.id && !isDoctor,
  });

  // Fetch Prescriptions for patients
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['patient-prescriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const query = isDoctor 
        ? supabase
            .from('prescriptions')
            .select('*')
            .eq('doctor_id', user.id)
        : supabase
            .from('prescriptions')
            .select('*')
            .eq('patient_id', user.id);
            
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: isDoctor ? 'Prescription Written' : 'Prescription Received',
        description: item.diagnosis || 'Medical prescription',
        timestamp: item.created_at,
        status: item.status,
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
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq(column, user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: isDoctor ? 'Appointment Scheduled' : 'Appointment Booked',
        description: `${item.notes || 'Consultation'} - ${format(new Date(item.scheduled_time), 'MMM dd, yyyy')}`,
        timestamp: item.created_at,
        status: item.status,
        icon: <Calendar className="h-4 w-4 text-blue-600" />
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch Doctor-specific data
  const { data: patientConsultations = [], isLoading: consultationsLoading } = useQuery({
    queryKey: ['doctor-consultations', user?.id],
    queryFn: async () => {
      if (!user?.id || !isDoctor) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_patient_id_fkey(first_name, last_name)
        `)
        .eq('doctor_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: 'Patient Consultation',
        description: `Consultation with ${(item as any).profiles?.first_name || 'Patient'} completed`,
        timestamp: item.updated_at,
        status: 'completed',
        icon: <Users className="h-4 w-4 text-teal-600" />
      }));
    },
    enabled: !!user?.id && isDoctor,
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