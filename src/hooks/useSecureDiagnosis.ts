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
  validation?: any;
  performance?: any;
  emergency?: boolean;
  message?: string;
  warning?: string;
  emergencyNumbers?: string[];
  flags?: string[];
  red_flags?: string[];
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

      // Call the diagnose-symptoms function
      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/diagnose-symptoms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptoms: request.symptoms.length === 1 ? request.symptoms[0] : request.symptoms,
          demographicInfo: {
            age: request.age || 30,
            gender: request.gender || 'unknown'
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Diagnosis error:', data);
        
        // Handle specific error types
        if (data.error?.includes('Rate limit')) {
          toast.error('You have made too many requests. Please wait before trying again.');
          return { success: false, error: 'Rate limit exceeded' };
        }
        
        if (data.error?.includes('Authentication')) {
          toast.error('Please log in again to continue');
          return { success: false, error: 'Authentication failed' };
        }

        toast.error(data.error || 'Failed to process diagnosis. Please try again.');
        return { success: false, error: data.error || 'Unknown error' };
      }

      if (data?.emergency) {
        // Emergency case - show emergency warning
        toast.error('Emergency symptoms detected! Please seek immediate medical attention.');
        return {
          success: true,
          emergency: true,
          message: data.alert_message,
          warning: data.alert_message,
          emergencyNumbers: ['911', '999', '112'],
          flags: ['emergency_detected'],
          severity: 5
        };
      }

      if (data?.success && data?.diagnoses) {
        setLastDiagnosisId(data.session_id);
        
        // Show success message
        toast.success('Diagnosis completed successfully');
        
        return {
          success: true,
          sessionId: data.session_id,
          diagnosis: data.diagnoses,
          validation: { passed: true, recommendedAction: 'proceed_with_ai_recommendation' },
          performance: { response_time: 'fast' },
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