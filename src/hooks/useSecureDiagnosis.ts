import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DiagnosisRequest {
  symptoms: string[];
  severity?: number;
  duration?: string;
  age?: number;
  gender?: string;
  medicalHistory?: string;
}

interface DiagnosisResponse {
  success: boolean;
  sessionId?: string;
  diagnosis?: any;
  emergency?: boolean;
  message?: string;
  warning?: string;
  emergencyNumbers?: string[];
  flags?: string[];
  severity?: number;
  error?: string;
}

export const useSecureDiagnosis = () => {
  const [loading, setLoading] = useState(false);
  const [lastDiagnosisId, setLastDiagnosisId] = useState<string | null>(null);
  const { user } = useAuth();

  const submitDiagnosis = async (request: DiagnosisRequest): Promise<DiagnosisResponse> => {
    if (!user) {
      toast.error('Please log in to use the diagnosis system');
      return { success: false, error: 'Authentication required' };
    }

    setLoading(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        toast.error('Please log in again to continue');
        return { success: false, error: 'Invalid session' };
      }

      // Input validation
      if (!request.symptoms || request.symptoms.length === 0) {
        toast.error('Please provide at least one symptom');
        return { success: false, error: 'No symptoms provided' };
      }

      // Call the secure diagnosis function
      const { data, error } = await supabase.functions.invoke('diagnose-symptoms-secure', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('Diagnosis error:', error);
        
        // Handle specific error types
        if (error.message?.includes('Rate limit')) {
          toast.error('You have made too many requests. Please wait before trying again.');
          return { success: false, error: 'Rate limit exceeded' };
        }
        
        if (error.message?.includes('Authentication')) {
          toast.error('Please log in again to continue');
          return { success: false, error: 'Authentication failed' };
        }

        toast.error('Failed to process diagnosis. Please try again.');
        return { success: false, error: error.message || 'Unknown error' };
      }

      if (data?.emergency) {
        // Emergency case - show emergency warning
        toast.error('Emergency symptoms detected! Please seek immediate medical attention.');
        return {
          success: true,
          emergency: true,
          message: data.message,
          warning: data.warning,
          emergencyNumbers: data.emergencyNumbers,
          flags: data.flags,
          severity: data.severity
        };
      }

      if (data?.success && data?.sessionId) {
        setLastDiagnosisId(data.sessionId);
        toast.success('Diagnosis completed successfully');
        return {
          success: true,
          sessionId: data.sessionId,
          diagnosis: data.diagnosis,
          emergency: false
        };
      }

      toast.error('Unexpected response from diagnosis system');
      return { success: false, error: 'Invalid response' };

    } catch (error) {
      console.error('Diagnosis submission error:', error);
      toast.error('Network error. Please check your connection and try again.');
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  const getDiagnosisHistory = async (limit: number = 10) => {
    if (!user) return { data: [], error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('diagnosis_sessions_v2')
        .select(`
          *,
          prescriptions_v2 (
            id,
            drugs,
            status,
            created_at,
            doctor_id
          ),
          emergency_flags (
            id,
            flag_type,
            severity_level,
            description,
            flagged_by,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data: data || [], error };
    } catch (error) {
      console.error('Error fetching diagnosis history:', error);
      return { data: [], error: 'Failed to fetch history' };
    }
  };

  const getAuditLogs = async (diagnosisId: string) => {
    if (!user) return { data: [], error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('diagnosis_id', diagnosisId)
        .order('created_at', { ascending: true });

      return { data: data || [], error };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { data: [], error: 'Failed to fetch audit logs' };
    }
  };

  return {
    loading,
    lastDiagnosisId,
    submitDiagnosis,
    getDiagnosisHistory,
    getAuditLogs
  };
};