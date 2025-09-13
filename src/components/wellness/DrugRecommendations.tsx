import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Pill, 
  AlertTriangle, 
  Clock,
  Calendar,
  FileText,
  ExternalLink,
  Shield,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Player from 'react-lottie-player';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import Lottie animation
import pillsAnimation from '@/assets/animations/pills-animation.json';

interface DrugRecommendation {
  drug_name: string;
  rxnorm_id?: string;
  form: string;
  strength?: string;
  dosage: string;
  frequency?: string;
  duration?: string;
  warnings: string[];
  notes?: string;
}

interface DrugRecommendationsProps {
  conditionId: string;
  conditionName: string;
  visible: boolean;
  onClose: () => void;
  onBookDoctor: () => void;
}

export const DrugRecommendations: React.FC<DrugRecommendationsProps> = ({
  conditionId,
  conditionName,
  visible,
  onClose,
  onBookDoctor,
}) => {
  const [drugs, setDrugs] = useState<DrugRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && conditionId) {
      fetchDrugRecommendations();
    }
  }, [visible, conditionId]);

  const fetchDrugRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/recommend-drug/${conditionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.recommendations) {
          setDrugs(data.recommendations);
          if (data.recommendations.length === 0) {
            setError('No drug recommendations available for this condition. Please consult a healthcare provider.');
          }
        } else {
          setError(data.message || 'No drug recommendations available');
        }
      } else {
        throw new Error('Failed to fetch drug recommendations');
      }
    } catch (error) {
      console.error('Failed to fetch drug recommendations:', error);
      setError('Failed to load drug recommendations. Please try again.');
      toast.error('Failed to fetch drug recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (warning: string) => {
    const lowerWarning = warning.toLowerCase();
    if (lowerWarning.includes('liver damage') || lowerWarning.includes('emergency') || lowerWarning.includes('immediate')) {
      return 'text-destructive';
    }
    if (lowerWarning.includes('consult') || lowerWarning.includes('monitor')) {
      return 'text-warning';
    }
    return 'text-muted-foreground';
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background border border-primary/20 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Pill className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Drug Recommendations</h2>
                  <p className="text-sm text-muted-foreground">For {conditionName}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                ×
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading && (
              <div className="text-center py-8">
                <Player
                  play
                  loop
                  animationData={pillsAnimation}
                  style={{ height: '120px', width: '120px' }}
                  className="mx-auto opacity-60"
                />
                <p className="text-muted-foreground mt-4">Loading recommendations...</p>
              </div>
            )}

            {error && (
              <Alert className="border-warning/20 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  <div className="space-y-3">
                    <p>{error}</p>
                    <Button onClick={onBookDoctor} variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Consult a Doctor Instead
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!loading && !error && drugs.length > 0 && (
              <div className="space-y-6">
                {/* Safety Notice */}
                <Alert className="border-primary/20 bg-primary/5">
                  <Shield className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <strong>Important:</strong> These are AI-generated recommendations for informational purposes only. 
                    Always consult with a qualified healthcare provider before taking any medication.
                  </AlertDescription>
                </Alert>

                {/* Drug List */}
                <div className="space-y-4">
                  {drugs.map((drug, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border-primary/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 p-2 rounded-full">
                                <Pill className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-bold">{drug.drug_name}</div>
                                <div className="text-sm text-muted-foreground font-normal">
                                  {drug.form} {drug.strength && `• ${drug.strength}`}
                                </div>
                              </div>
                            </div>
                            {drug.rxnorm_id && (
                              <Badge variant="outline" className="text-xs">
                                RxNorm: {drug.rxnorm_id}
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Dosage Information */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Dosage</span>
                              </div>
                              <p className="text-sm">{drug.dosage}</p>
                            </div>
                            
                            {drug.frequency && (
                              <div className="bg-muted/50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Frequency</span>
                                </div>
                                <p className="text-sm">{drug.frequency}</p>
                              </div>
                            )}
                            
                            {drug.duration && (
                              <div className="bg-muted/50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Duration</span>
                                </div>
                                <p className="text-sm">{drug.duration}</p>
                              </div>
                            )}
                          </div>

                          {/* Warnings */}
                          {drug.warnings && drug.warnings.length > 0 && (
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="warnings" className="border-warning/20">
                                <AccordionTrigger className="text-warning hover:text-warning">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Safety Warnings & Precautions ({drug.warnings.length})
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2">
                                  {drug.warnings.map((warning, wIndex) => (
                                    <div key={wIndex} className="flex items-start gap-2 p-2 bg-warning/5 rounded border border-warning/20">
                                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(warning)}`} />
                                      <span className="text-sm">{warning}</span>
                                    </div>
                                  ))}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}

                          {/* Additional Notes */}
                          {drug.notes && (
                            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                              <div className="flex items-center gap-2 mb-1">
                                <Info className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Additional Notes</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{drug.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button onClick={onBookDoctor} className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Doctor Consultation
                  </Button>
                  
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Close
                  </Button>
                </div>

                {/* Medical Disclaimer */}
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong>Medical Disclaimer:</strong> This information is provided for educational purposes only. 
                    Dosages, interactions, and contraindications may vary based on individual factors. 
                    Always verify with a healthcare provider and read official prescribing information 
                    before taking any medication.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};