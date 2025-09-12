import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  AlertTriangle, 
  Pill, 
  Calendar,
  Download,
  Share2,
  MessageCircle,
  Mail,
  Save,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';

interface DiagnosisCondition {
  condition: string;
  probability: number;
  explanation: string;
}

interface DiagnosisResultsData {
  sessionId: string;
  results: DiagnosisCondition[];
}

interface DrugRecommendation {
  condition: string;
  drugs: Array<{
    name: string;
    rxnormId: string;
    form: string;
    strength: string;
    dosage: string;
    warnings: string;
  }>;
}

interface DiagnosisResultsProps {
  data: DiagnosisResultsData;
  onBookDoctor: () => void;
  onSaveDiagnosis: () => void;
  userProfile?: any;
}

export const DiagnosisResults: React.FC<DiagnosisResultsProps> = ({
  data,
  onBookDoctor,
  onSaveDiagnosis,
  userProfile
}) => {
  const { toast } = useToast();
  const [drugRecommendations, setDrugRecommendations] = useState<Record<string, DrugRecommendation>>({});
  const [loadingDrugs, setLoadingDrugs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const fetchDrugRecommendations = async (condition: string, conditionId: string) => {
    if (drugRecommendations[condition]) return;

    setLoadingDrugs(prev => ({ ...prev, [condition]: true }));
    
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(
        `https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/recommend-drug/${conditionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const drugData = await response.json();
        setDrugRecommendations(prev => ({
          ...prev,
          [condition]: drugData
        }));
      } else {
        throw new Error('Failed to fetch drug recommendations');
      }
    } catch (error) {
      console.error('Error fetching drug recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load drug recommendations",
        variant: "destructive",
      });
    } finally {
      setLoadingDrugs(prev => ({ ...prev, [condition]: false }));
    }
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246); // Blue color
      pdf.text('PrescriblyAI', 20, 20);
      pdf.text('Diagnostic Report', 20, 35);
      
      // Patient info
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Patient: ${userProfile?.first_name || 'Patient'} ${userProfile?.last_name || ''}`, 20, 50);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 60);
      pdf.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 70);
      pdf.text(`Report ID: ${data.sessionId.substring(0, 8)}`, 20, 80);
      
      // Diagnosis Results
      pdf.setFontSize(16);
      pdf.text('AI Diagnosis Results', 20, 100);
      
      let yPosition = 120;
      data.results.forEach((result, index) => {
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${index + 1}. ${result.condition}`, 30, yPosition);
        
        pdf.setFont(undefined, 'normal');
        pdf.text(`   Probability: ${(result.probability * 100).toFixed(1)}%`, 30, yPosition + 10);
        
        // Wrap explanation text
        const explanation = pdf.splitTextToSize(`   ${result.explanation}`, 150);
        pdf.text(explanation, 30, yPosition + 20);
        
        yPosition += 40 + (explanation.length * 5);
        
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
      });

      // Drug recommendations
      Object.entries(drugRecommendations).forEach(([condition, drugs]) => {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.text(`Recommended Medications for ${condition}`, 20, yPosition);
        yPosition += 15;
        
        drugs.drugs?.forEach(drug => {
          pdf.setFontSize(10);
          pdf.text(`• ${drug.name} (${drug.strength})`, 30, yPosition);
          pdf.text(`  Dosage: ${drug.dosage}`, 30, yPosition + 8);
          pdf.text(`  Warnings: ${drug.warnings}`, 30, yPosition + 16);
          yPosition += 25;
        });
      });
      
      // Footer
      pdf.setFontSize(8);
      pdf.text('This report is generated by AI and should not replace professional medical advice.', 20, 280);
      pdf.text('Please consult with a healthcare provider for proper diagnosis and treatment.', 20, 288);
      
      pdf.save(`diagnosis-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: "Your diagnosis report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const topCondition = data.results[0];
    const message = `My AI Health Assessment Results:

🏥 Top Condition: ${topCondition.condition} (${(topCondition.probability * 100).toFixed(1)}% match)
📝 Explanation: ${topCondition.explanation}

📅 Assessment Date: ${new Date().toLocaleDateString()}
🤖 Generated by PrescriblyAI

⚠️ This is an AI assessment. Please consult a healthcare provider for proper diagnosis.`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const subject = 'My AI Health Assessment Results';
    const body = `Dear Healthcare Provider,

I've completed an AI health assessment and would like to share the results with you:

Patient Information:
- Name: ${userProfile?.first_name || 'Patient'} ${userProfile?.last_name || ''}
- Assessment Date: ${new Date().toLocaleDateString()}
- Report ID: ${data.sessionId.substring(0, 8)}

AI Diagnosis Results:
${data.results.map((result, index) => 
  `${index + 1}. ${result.condition} (${(result.probability * 100).toFixed(1)}% probability)
     Explanation: ${result.explanation}`
).join('\n\n')}

Please note: This is an AI-generated assessment and should not replace professional medical evaluation. I would appreciate your expert review and guidance.

Best regards,
${userProfile?.first_name || 'Patient'} ${userProfile?.last_name || ''}

Generated by PrescriblyAI (www.prescribly.com)`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveDiagnosis();
      toast({
        title: "Diagnosis Saved",
        description: "Your diagnosis has been saved to your medical records.",
      });
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      toast({
        title: "Error",
        description: "Failed to save diagnosis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">AI Diagnosis Results</h2>
        </div>
        <p className="text-muted-foreground">
          Based on your symptoms, here are the most likely conditions
        </p>
      </motion.div>

      {/* Diagnosis Cards */}
      <div className="space-y-4">
        {data.results.map((result, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                      #{index + 1}
                    </span>
                    <span>{result.condition}</span>
                  </div>
                  <Badge variant={
                    result.probability > 0.7 ? 'destructive' : 
                    result.probability > 0.4 ? 'default' : 'secondary'
                  }>
                    {(result.probability * 100).toFixed(1)}% match
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Probability</span>
                    <span className="text-sm text-muted-foreground">
                      {(result.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={result.probability * 100} className="h-2" />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{result.explanation}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDrugRecommendations(result.condition, `condition-${index}`)}
                    disabled={loadingDrugs[result.condition]}
                    className="flex items-center gap-2"
                  >
                    <Pill className="h-4 w-4" />
                    {loadingDrugs[result.condition] ? 'Loading...' : 'See Recommended Drugs'}
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={onBookDoctor}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Book Doctor
                  </Button>
                </div>

                {/* Drug Recommendations */}
                {drugRecommendations[result.condition] && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`drugs-${index}`}>
                      <AccordionTrigger className="text-sm">
                        Recommended Medications ({drugRecommendations[result.condition].drugs?.length || 0})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {drugRecommendations[result.condition].drugs?.map((drug, drugIndex) => (
                            <div key={drugIndex} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{drug.name}</h4>
                                <Badge variant="outline">{drug.form}</Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div><strong>Strength:</strong> {drug.strength}</div>
                                <div><strong>RxNorm ID:</strong> {drug.rxnormId}</div>
                                <div><strong>Dosage:</strong> {drug.dosage}</div>
                              </div>
                              {drug.warnings && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <strong className="text-yellow-800">Warnings:</strong>
                                      <p className="text-yellow-700">{drug.warnings}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )) || (
                            <p className="text-muted-foreground text-sm">
                              No specific drugs available. Please consult a doctor for appropriate treatment.
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-blue-50 border-primary/20">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Save & Share Your Results</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Export your diagnosis report or share it with healthcare providers
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Report'}
                </Button>

                <Button
                  onClick={generatePDF}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>

                <Button
                  onClick={shareViaWhatsApp}
                  variant="outline"
                  className="flex items-center gap-2 text-green-700 hover:text-green-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>

                <Button
                  onClick={shareViaEmail}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>

                <Button
                  onClick={onBookDoctor}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Book Doctor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Disclaimer */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 mb-1">Important Medical Disclaimer</p>
              <p className="text-yellow-700">
                This AI assessment is for informational purposes only and should not replace professional medical advice, 
                diagnosis, or treatment. Always consult with a qualified healthcare provider for proper medical evaluation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};