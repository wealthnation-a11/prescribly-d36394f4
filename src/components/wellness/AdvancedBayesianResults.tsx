import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Activity, 
  Pill, 
  TrendingUp,
  Info,
  AlertCircle,
  CheckCircle,
  Brain,
  BarChart3,
  Stethoscope,
  FileText,
  Calendar,
  Star,
  Zap,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BayesianResult {
  condition: string;
  conditionId: number;
  probability: number;
  confidence: number;
  explanation: string;
  symptoms: string[];
  drugRecommendations: any[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  prevalence: number;
}

interface AdvancedBayesianResultsProps {
  results: BayesianResult[];
  onBookConsultation: () => void;
  onSaveResults: () => void;
  analysisMetadata?: {
    symptomsParsed: number;
    conditionsAnalyzed: number;
    confidenceThreshold: number;
    algorithm: string;
  };
}

export const AdvancedBayesianResults: React.FC<AdvancedBayesianResultsProps> = ({
  results,
  onBookConsultation,
  onSaveResults,
  analysisMetadata
}) => {
  const navigate = useNavigate();
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  if (!results?.length) {
    return (
      <Card className="border-muted">
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Analysis Results</h3>
          <p className="text-muted-foreground">Please describe your symptoms to get started.</p>
        </CardContent>
      </Card>
    );
  }

  const topResult = results[0];
  const hasHighConfidence = topResult.probability >= 75;

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getRiskColorClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'border-destructive/50 bg-destructive/5';
      case 'high': return 'border-orange-500/50 bg-orange-50';
      case 'medium': return 'border-yellow-500/50 bg-yellow-50';
      default: return 'border-green-500/50 bg-green-50';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Analysis Overview */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Advanced Bayesian Analysis
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10 border-primary/30">
              {analysisMetadata?.algorithm || 'AI Diagnosis'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{results.length}</div>
              <div className="text-sm text-muted-foreground">Conditions Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisMetadata?.symptomsParsed || 0}</div>
              <div className="text-sm text-muted-foreground">Symptoms Parsed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{Math.round(topResult.probability)}%</div>
              <div className="text-sm text-muted-foreground">Top Match</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{topResult.confidence}%</div>
              <div className="text-sm text-muted-foreground">Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Result */}
      <Card className={`shadow-lg ${getRiskColorClass(topResult.riskLevel)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="h-5 w-5" />
              Most Likely Condition
            </CardTitle>
            <div className="flex items-center gap-2">
              {getRiskIcon(topResult.riskLevel)}
              <Badge variant={topResult.riskLevel === 'critical' ? 'destructive' : 'secondary'}>
                {topResult.riskLevel.toUpperCase()} PRIORITY
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-primary mb-2">{topResult.condition}</h3>
            <p className="text-muted-foreground mb-2">{topResult.description}</p>
            <p className="text-sm text-muted-foreground italic">{topResult.explanation}</p>
          </div>

          {/* Probability Visualization */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Bayesian Probability
              </span>
              <span className={`text-xl font-bold ${getProbabilityColor(topResult.probability)}`}>
                {topResult.probability.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={topResult.probability} 
              className="h-4"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Confidence: {topResult.confidence}%</span>
              <span>Prevalence: {(topResult.prevalence * 100).toFixed(1)}%</span>
              <span>Symptoms: {topResult.symptoms.length}</span>
            </div>
          </div>

          {/* Drug Recommendations */}
          {topResult.drugRecommendations?.length > 0 && (
            <div className="bg-background/80 rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-primary">Recommended Treatment</h4>
              </div>
              <div className="space-y-3">
                {topResult.drugRecommendations.slice(0, 3).map((drug, index) => (
                  <div key={index} className="bg-background rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{drug.drug}</span>
                      <Badge variant="secondary" className="text-xs">
                        {drug.dosage || 'As prescribed'}
                      </Badge>
                    </div>
                    {drug.notes && (
                      <p className="text-sm text-muted-foreground">{drug.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Indicator */}
          <div className={`p-3 rounded-lg border ${hasHighConfidence ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-2">
              {hasHighConfidence ? 
                <CheckCircle className="h-4 w-4 text-green-600" /> : 
                <Info className="h-4 w-4 text-yellow-600" />
              }
              <span className="text-sm font-medium">
                {hasHighConfidence ? 
                  'High Confidence Analysis' : 
                  'Moderate Confidence - Consider Additional Questions'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Diagnoses */}
      {results.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Alternative Possibilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.slice(1, 4).map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.condition}</span>
                      {getRiskIcon(result.riskLevel)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.description.split('.')[0]}...
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Progress value={result.probability} className="h-1.5 flex-1" />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-bold text-primary">{result.probability.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">probability</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis */}
      {showDetailedAnalysis && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detailed Analysis Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Symptom Analysis</h4>
                <div className="space-y-1">
                  {topResult.symptoms.map((symptom, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{symptom}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Statistical Factors</h4>
                <div className="text-sm space-y-1">
                  <div>Population prevalence: {(topResult.prevalence * 100).toFixed(1)}%</div>
                  <div>Symptom match rate: {topResult.confidence}%</div>
                  <div>Bayesian prior: {(topResult.prevalence * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Disclaimer */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive mb-1">
                ⚠️ AI-Powered Medical Analysis Disclaimer
              </p>
              <p className="text-xs text-muted-foreground">
                This advanced Bayesian analysis is for informational purposes only and should not replace professional medical advice. 
                Always consult with a licensed healthcare provider for proper diagnosis and treatment. 
                Seek immediate medical attention for serious symptoms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={onBookConsultation}
          className="flex-1 bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Stethoscope className="h-4 w-4 mr-2" />
          Book Doctor Consultation
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
          className="flex-1 sm:flex-none border-primary/30 hover:bg-primary/5"
        >
          <FileText className="h-4 w-4 mr-2" />
          {showDetailedAnalysis ? 'Hide' : 'Show'} Details
        </Button>
        <Button 
          variant="outline" 
          onClick={onSaveResults}
          className="flex-1 sm:flex-none border-primary/30 hover:bg-primary/5"
        >
          <Activity className="h-4 w-4 mr-2" />
          Save Results
        </Button>
      </div>
    </div>
  );
};