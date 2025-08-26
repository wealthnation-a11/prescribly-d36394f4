// DEPRECATED: This file has been replaced by AdvancedWellnessChecker.tsx
// Redirecting to the new advanced system...

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProgressSteps } from '@/components/ai/ProgressSteps';
import { AdaptiveQuestionView, type AdaptiveQuestion } from '@/components/ai/AdaptiveQuestion';
import { BayesianResults } from '@/components/wellness/BayesianResults';
import { SymptomInput } from '@/components/wellness/SymptomInput';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  isTyping?: boolean;
  component?: 'question' | 'diagnosis' | 'welcome';
}

interface UserProfile {
  age?: number;
  gender?: string;
  location?: string;
  medicalHistory?: string;
}

interface BayesianResult {
  condition: string;
  conditionId: number;
  probability: number;
  confidence: number;
  explanation: string;
  symptoms: string[];
  drugRecommendations: any[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface DiagnosisSession {
  sessionId: string;
  results: BayesianResult[];
  needsMoreInfo: boolean;
  nextQuestion?: AdaptiveQuestion;
  totalSymptoms: number;
}

const WellnessChecker = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the new advanced wellness checker
    navigate('/advanced-wellness', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Redirecting to Advanced System...</h2>
        <p className="text-muted-foreground">Loading the new Bayesian AI diagnosis system.</p>
      </div>
    </div>
  );
};

export default WellnessChecker;