import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SessionData {
  currentStep: number;
  symptoms: string[];
  diagnosisResults: any;
  clarifyingAnswers: Record<string, string>;
  drugRecommendations: any[];
  path: string;
}

export const useSessionManager = (initialPath: string = 'ai-health-companion') => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Save session data
  const saveSession = useCallback(async (data: Partial<SessionData>) => {
    if (!user) return;

    try {
      const { data: result } = await supabase.functions.invoke('save-session', {
        body: {
          session_id: sessionId,
          user_id: user.id,
          path: initialPath,
          payload: data
        }
      });

      if (result?.session_id && !sessionId) {
        setSessionId(result.session_id);
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [user, sessionId, initialPath]);

  // Auto-save session data when user leaves
  const setupAutoSave = useCallback((getCurrentState: () => Partial<SessionData>) => {
    const handleBeforeUnload = () => {
      const currentState = getCurrentState();
      if (currentState.currentStep && currentState.currentStep > 1) {
        // Save session on page unload
        saveSession(currentState);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const currentState = getCurrentState();
        if (currentState.currentStep && currentState.currentStep > 1) {
          saveSession(currentState);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveSession]);

  // Check for existing session on mount
  const checkForExistingSession = useCallback(async (): Promise<SessionData | null> => {
    if (!user) return null;

    setIsRestoring(true);
    try {
      // Get the most recent session for this user and path
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('path', initialPath)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        
        // Check if session is recent (within 24 hours)
        const sessionAge = Date.now() - new Date(session.updated_at).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge <= maxAge && session.payload) {
          setSessionId(session.id);
          return session.payload as unknown as SessionData;
        }
      }
    } catch (error) {
      console.error('Error checking for existing session:', error);
    } finally {
      setIsRestoring(false);
    }

    return null;
  }, [user, initialPath]);

  // Clear current session
  const clearSession = useCallback(async () => {
    if (sessionId && user) {
      try {
        await supabase
          .from('user_sessions')
          .delete()
          .eq('id', sessionId);
        
        setSessionId(null);
      } catch (error) {
        console.error('Error clearing session:', error);
      }
    }
  }, [sessionId, user]);

  return {
    saveSession,
    checkForExistingSession,
    clearSession,
    setupAutoSave,
    isRestoring,
    sessionId
  };
};