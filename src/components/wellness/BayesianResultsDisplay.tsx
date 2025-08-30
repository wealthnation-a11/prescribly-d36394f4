import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  Pill, 
  Stethoscope,
  Save,
  TrendingUp,
  Clock,
  Target,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

interface BayesianResult {
  condition: string;
  probability: number;
  confidence: number;
  explanation: string;
  symptoms: string[];
  drugRecommendation?: {
    name: string;
    dosage: string;
    notes: string;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface BayesianResultsDisplayProps {
  results: BayesianResult[];
  onConsultDoctor: () => void;
  onSaveResults: () => void;
}

export const BayesianResultsDisplay: React.FC<BayesianResultsDisplayProps> = ({
  results,
  onConsultDoctor,
  onSaveResults
}) => {
  if (results.length === 0) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Analysis Unavailable
          </h3>
          <p className="text-muted-foreground mb-4">
            We couldn't find a confident match for your symptoms. This doesn't mean nothing is wrong.
          </p>
          <Button 
            onClick={onConsultDoctor}
            className="bg-[hsl(205,100%,36%)] hover:bg-[hsl(205,100%,36%)]/90"
          >
            <Stethoscope className="h-4 w-4 mr-2" />
            Consult a Doctor Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topResult = results[0];
  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Target className="h-4 w-4 text-yellow-600" />;
      default: return <Shield className="h-4 w-4 text-green-600" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Critical condition warning */}
      {topResult.riskLevel === 'critical' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <span className="font-bold text-lg">⚠️ Urgent Medical Attention Required</span>
          </div>
          <p className="text-red-700 font-medium">
            Your symptoms may indicate a serious condition. Please consult a healthcare provider immediately.
          </p>
        </motion.div>
      )}

      {/* Primary diagnosis */}
      <Card className="border-[hsl(205,100%,36%)]/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[hsl(205,100%,36%)]/5 to-[hsl(199,89%,64%)]/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-[hsl(205,100%,36%)] flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Most Likely Diagnosis
            </CardTitle>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${getRiskColor(topResult.riskLevel)}`}>
              {getRiskIcon(topResult.riskLevel)}
              <span className="text-sm font-medium capitalize">{topResult.riskLevel} Risk</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <h3 className="text-3xl font-bold text-[hsl(205,100%,36%)] mb-3">
              {topResult.condition}
            </h3>
            <p className="text-muted-foreground text-lg">
              {topResult.explanation}
            </p>
          </div>

          {/* Probability and confidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Probability</span>
                <span className="text-xl font-bold text-[hsl(205,100%,36%)]">
                  {topResult.probability.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={topResult.probability} 
                className="h-3" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Confidence</span>
                <span className="text-xl font-bold text-[hsl(199,89%,64%)]">
                  {topResult.confidence.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={topResult.confidence} 
                className="h-3"
              />
            </div>
          </div>

          {/* Matching symptoms */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Matching Symptoms
            </h4>
            <div className="flex flex-wrap gap-2">
              {topResult.symptoms.map((symptom, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>

          {/* Drug recommendation */}
          {topResult.drugRecommendation && (
            <div className="bg-gradient-to-r from-[hsl(205,100%,36%)]/5 to-[hsl(199,89%,64%)]/5 rounded-lg p-4 border border-[hsl(205,100%,36%)]/10">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="h-5 w-5 text-[hsl(205,100%,36%)]" />
                <h4 className="font-semibold text-[hsl(205,100%,36%)]">💊 Recommended Treatment</h4>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-lg">{topResult.drugRecommendation.name}</span>
                  <Badge variant="outline" className="text-sm font-medium">
                    {topResult.drugRecommendation.dosage}
                  </Badge>
                </div>
                {topResult.drugRecommendation.notes && (
                  <p className="text-sm text-muted-foreground">
                    💡 {topResult.drugRecommendation.notes}
                  </p>
                )}
                
                {/* Safety disclaimer */}
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-red-800">
                      <p className="font-semibold mb-1">⚠️ Important Safety Information</p>
                      <p>AI-generated recommendation. Not a medical prescription. Always consult a licensed healthcare provider before taking any medication.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative diagnoses */}
      {results.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[hsl(205,100%,36%)]">
              <Clock className="h-5 w-5" />
              Alternative Possibilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.slice(1, 3).map((result, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold">{result.condition}</div>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getRiskColor(result.riskLevel)}`}>
                        {getRiskIcon(result.riskLevel)}
                        <span className="capitalize">{result.riskLevel}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.explanation}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-bold text-[hsl(205,100%,36%)] text-lg">
                      {result.probability.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.confidence.toFixed(0)}% confident
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={onConsultDoctor}
          className="flex-1 bg-[hsl(205,100%,36%)] hover:bg-[hsl(205,100%,36%)]/90 text-lg py-6"
          size="lg"
        >
          <Stethoscope className="h-5 w-5 mr-2" />
          👩‍⚕️ Consult a Prescribly Doctor
        </Button>
        <Button 
          variant="outline" 
          onClick={onSaveResults}
          className="flex-1 sm:flex-none border-[hsl(205,100%,36%)]/30 hover:bg-[hsl(205,100%,36%)]/5 py-6"
          size="lg"
        >
          <Save className="h-5 w-5 mr-2" />
          💾 Save to History
        </Button>
      </div>

      {/* Medical disclaimer */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800 mb-2">
                ⚠️ Medical Disclaimer
              </p>
              <p className="text-sm text-red-700">
                This AI analysis is for informational purposes only and does not constitute medical advice, 
                diagnosis, or treatment. Always seek advice from qualified healthcare providers for health concerns. 
                In emergencies, call your local emergency number immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accuracy note */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          🧠 Bayesian AI Model • Estimated accuracy: 85–95% • Improves with usage
        </p>
      </div>
    </motion.div>
  );
};