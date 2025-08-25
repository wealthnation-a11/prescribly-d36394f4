import React from 'react';
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
  CheckCircle
} from 'lucide-react';

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

interface BayesianResultsProps {
  results: BayesianResult[];
  onBookConsultation: () => void;
  onSaveResults: () => void;
}

export const BayesianResults: React.FC<BayesianResultsProps> = ({
  results,
  onBookConsultation,
  onSaveResults
}) => {
  if (!results?.length) return null;

  const topResult = results[0];
  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'green';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary Result */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Most Likely Diagnosis
            </CardTitle>
            <div className="flex items-center gap-2">
              {getRiskIcon(topResult.riskLevel)}
              <Badge variant="outline" className={`border-${getRiskColor(topResult.riskLevel)}-500/30`}>
                {topResult.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-primary mb-2">{topResult.condition}</h3>
            <p className="text-muted-foreground">{topResult.explanation}</p>
          </div>

          {/* Probability Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Bayesian Probability</span>
              <span className="text-lg font-bold text-primary">{topResult.probability.toFixed(1)}%</span>
            </div>
            <Progress 
              value={topResult.probability} 
              className="h-3"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Confidence: {topResult.confidence}%</span>
              <span>Based on {topResult.symptoms.length} symptoms</span>
            </div>
          </div>

          {/* Drug Recommendations */}
          {topResult.drugRecommendations?.length > 0 && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-primary">Recommended Treatment</h4>
              </div>
              <div className="space-y-2">
                {topResult.drugRecommendations.slice(0, 2).map((drug, index) => (
                  <div key={index} className="flex items-center justify-between bg-background rounded p-2">
                    <span className="font-medium">{drug.drug || drug.name || drug}</span>
                    <Badge variant="secondary" className="text-xs">
                      {drug.dosage || 'As prescribed'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">{result.condition}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.explanation.split('.')[0]}...
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{result.probability.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">confidence</div>
                  </div>
                </div>
              ))}
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
                ⚠️ Medical Disclaimer
              </p>
              <p className="text-xs text-muted-foreground">
                This AI analysis is for informational purposes only. Always consult with a licensed healthcare 
                provider for proper medical diagnosis and treatment. Do not delay seeking medical care based on this assessment.
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
          <Activity className="h-4 w-4 mr-2" />
          Consult a Prescribly Doctor
        </Button>
        <Button 
          variant="outline" 
          onClick={onSaveResults}
          className="flex-1 sm:flex-none border-primary/30 hover:bg-primary/5"
        >
          Save Results
        </Button>
      </div>
    </div>
  );
};