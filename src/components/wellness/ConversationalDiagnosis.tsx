import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  Share2,
  MessageCircle,
  Mail,
  Pill,
  Calendar,
  Bookmark
} from 'lucide-react';
import { motion } from 'framer-motion';
import Player from 'react-lottie-player';
import { toast } from 'sonner';

// Import Lottie animations
import heartbeatPulse from '@/assets/animations/heartbeat-pulse.json';
import medicalScan from '@/assets/animations/medical-scan.json';

interface Condition {
  id: string;
  name: string;
  probability: number;
  explanation: string;
  icd10_code?: string;
}

interface DiagnosisResultsProps {
  conditions: Condition[];
  redFlags: string[];
  sessionId: string;
  onDrugRecommendations: (conditionId: string, conditionName: string) => void;
  onBookDoctor: (conditionId: string) => void;
  onSaveDiagnosis: () => void;
  onGeneratePDF: () => void;
  onShareWhatsApp: () => void;
  onShareEmail: () => void;
}

export const ConversationalDiagnosis: React.FC<DiagnosisResultsProps> = ({
  conditions,
  redFlags,
  sessionId,
  onDrugRecommendations,
  onBookDoctor,
  onSaveDiagnosis,
  onGeneratePDF,
  onShareWhatsApp,
  onShareEmail,
}) => {
  const [savedDiagnosis, setSavedDiagnosis] = useState(false);

  const handleSaveDiagnosis = async () => {
    try {
      await onSaveDiagnosis();
      setSavedDiagnosis(true);
      toast.success('Diagnosis saved successfully!');
    } catch (error) {
      toast.error('Failed to save diagnosis');
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-destructive';
    if (probability >= 60) return 'text-warning';
    if (probability >= 40) return 'text-primary';
    return 'text-muted-foreground';
  };

  const getProbabilityBg = (probability: number) => {
    if (probability >= 80) return 'bg-destructive';
    if (probability >= 60) return 'bg-warning';
    if (probability >= 40) return 'bg-primary';
    return 'bg-muted';
  };

  if (!conditions || conditions.length === 0) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Player
              play
              loop
              animationData={heartbeatPulse}
              style={{ height: '120px', width: '120px' }}
              className="mx-auto opacity-60"
            />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No Clear Diagnosis Found
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Based on your symptoms, we couldn't determine a specific condition. 
            Please consult with a healthcare professional for proper evaluation.
          </p>
          <Button onClick={() => onBookDoctor('')} className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Consult a Doctor
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Red Flags Alert */}
      {redFlags && redFlags.length > 0 && (
        <Alert className="border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium text-destructive">Important Safety Notes:</div>
              {redFlags.map((flag, index) => (
                <div key={index} className="text-sm">
                  {flag}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* AI Analysis Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-4">
          <Player
            play
            loop
            animationData={medicalScan}
            style={{ height: '80px', width: '80px' }}
            className="mx-auto opacity-80"
          />
        </div>
        <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          AI Diagnosis Results
        </h3>
        <p className="text-muted-foreground">
          Top {conditions.length} most likely condition{conditions.length > 1 ? 's' : ''} based on your symptoms
        </p>
      </motion.div>

      {/* Diagnosis Cards */}
      <div className="grid gap-4">
        {conditions.map((condition, index) => (
          <motion.div
            key={condition.id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-l-4 ${
              index === 0 ? 'border-l-primary bg-primary/5' : 'border-l-muted'
            } hover:shadow-md transition-shadow`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {index === 0 && <CheckCircle className="h-5 w-5 text-primary" />}
                    {condition.name}
                    {index === 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Most Likely
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={`${getProbabilityColor(condition.probability)} font-mono`}
                  >
                    {condition.probability}%
                  </Badge>
                </div>
                
                {/* Probability Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Confidence Level</span>
                    <span>{condition.probability}%</span>
                  </div>
                  <Progress 
                    value={condition.probability} 
                    className={`h-2 ${getProbabilityBg(condition.probability)}`}
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Explanation */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-1">AI Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    {condition.explanation}
                  </p>
                </div>

                {/* ICD-10 Code */}
                {condition.icd10_code && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">ICD-10:</span> {condition.icd10_code}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDrugRecommendations(condition.id || condition.name, condition.name)}
                    className="flex-1 min-w-0"
                  >
                    <Pill className="h-4 w-4 mr-2" />
                    See Medications
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBookDoctor(condition.id || condition.name)}
                    className="flex-1 min-w-0"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Doctor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Save Diagnosis */}
        <Button
          onClick={handleSaveDiagnosis}
          disabled={savedDiagnosis}
          className="w-full"
          size="lg"
        >
          {savedDiagnosis ? (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Diagnosis Saved
            </>
          ) : (
            <>
              <Bookmark className="h-5 w-5 mr-2" />
              Save Diagnosis
            </>
          )}
        </Button>

        {/* Export & Share Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={onGeneratePDF}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          
          <Button
            variant="outline"
            onClick={onShareWhatsApp}
            className="w-full text-green-600 border-green-200 hover:bg-green-50"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Share WhatsApp
          </Button>
          
          <Button
            variant="outline"
            onClick={onShareEmail}
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Report
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          <strong>Medical Disclaimer:</strong> This AI diagnosis is for informational purposes only 
          and should not replace professional medical advice. Always consult with a qualified 
          healthcare provider for proper diagnosis and treatment.
        </p>
      </div>
    </div>
  );
};