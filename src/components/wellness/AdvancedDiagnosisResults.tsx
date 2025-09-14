import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  ShieldCheck,
  Syringe,
  Droplets
} from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface DiagnosisCondition {
  name: string;
  probability?: number;
  explanation: string;
  id?: string;
}

interface Medication {
  drug_name: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  form?: string;
}

interface AdvancedDiagnosisResultsProps {
  diagnoses: DiagnosisCondition[];
  medications: Record<string, Medication[]>;
  loadingMedications: Record<string, boolean>;
  onFetchMedications: (conditionId: string, conditionName: string) => void;
  onBookDoctor: (sessionId?: string) => void;
  onSaveDiagnosis: () => void;
  sessionId?: string;
  userProfile?: any;
}

export const AdvancedDiagnosisResults: React.FC<AdvancedDiagnosisResultsProps> = ({
  diagnoses,
  medications,
  loadingMedications,
  onFetchMedications,
  onBookDoctor,
  onSaveDiagnosis,
  sessionId,
  userProfile
}) => {
  const [expandedMedications, setExpandedMedications] = useState<Record<string, boolean>>({});

  const getFormIcon = (form: string) => {
    const formLower = form?.toLowerCase() || '';
    if (formLower.includes('tablet') || formLower.includes('capsule') || formLower.includes('pill')) {
      return <Pill className="h-4 w-4" />;
    }
    if (formLower.includes('injection') || formLower.includes('inject')) {
      return <Syringe className="h-4 w-4" />;
    }
    if (formLower.includes('syrup') || formLower.includes('liquid') || formLower.includes('solution')) {
      return <Droplets className="h-4 w-4" />;
    }
    return <Pill className="h-4 w-4" />;
  };

  const getProbabilityDisplay = (probability?: number) => {
    const prob = probability || 0.5; // Fallback to 50%
    return Math.round(prob * 100);
  };

  const isHighPriority = (probability?: number) => {
    const prob = probability || 0.5;
    return prob > 0.8;
  };

  const generateConditionPDF = async (condition: DiagnosisCondition) => {
    try {
      const pdf = new jsPDF();
      const conditionMeds = medications[condition.name] || [];
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246);
      pdf.text('PrescriblyAI', 20, 20);
      pdf.setFontSize(16);
      pdf.text(`Diagnosis Report: ${condition.name}`, 20, 35);
      
      // Patient info
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const patientName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Patient';
      pdf.text(`Patient: ${patientName}`, 20, 55);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 65);
      pdf.text(`Probability: ${getProbabilityDisplay(condition.probability)}%`, 20, 75);
      
      // Condition details
      pdf.setFontSize(14);
      pdf.text('Condition Details', 20, 95);
      pdf.setFontSize(10);
      const explanation = pdf.splitTextToSize(condition.explanation, 170);
      pdf.text(explanation, 20, 105);
      
      let yPos = 125 + (explanation.length * 5);
      
      // Medications
      if (conditionMeds.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Recommended Medications', 20, yPos);
        yPos += 15;
        
        conditionMeds.forEach((med, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${index + 1}. ${med.drug_name}`, 25, yPos);
          
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(10);
          if (med.strength) pdf.text(`   Strength: ${med.strength}`, 25, yPos + 8);
          if (med.dosage) pdf.text(`   Dosage: ${med.dosage}`, 25, yPos + 16);
          if (med.frequency) pdf.text(`   Frequency: ${med.frequency}`, 25, yPos + 24);
          if (med.duration) pdf.text(`   Duration: ${med.duration}`, 25, yPos + 32);
          
          yPos += 45;
        });
      }
      
      // Disclaimer
      pdf.setFontSize(8);
      pdf.text('⚠️ Consult a healthcare provider before use. This is an AI assessment for informational purposes only.', 20, 280);
      
      const fileName = `${condition.name.replace(/[^a-z0-9]/gi, '_')}_report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success(`PDF report for ${condition.name} downloaded successfully!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const shareConditionViaWhatsApp = (condition: DiagnosisCondition) => {
    const message = `🏥 Health Assessment Results

🔍 Condition: ${condition.name}
📊 Probability: ${getProbabilityDisplay(condition.probability)}%
📝 Details: ${condition.explanation}

📅 Date: ${new Date().toLocaleDateString()}
🤖 Generated by PrescriblyAI

⚠️ Please consult a healthcare provider for proper diagnosis and treatment.`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareConditionViaEmail = (condition: DiagnosisCondition) => {
    const subject = `Health Assessment: ${condition.name}`;
    const body = `Dear Healthcare Provider,

I've completed an AI health assessment for the condition: ${condition.name}

Assessment Results:
- Probability: ${getProbabilityDisplay(condition.probability)}%
- Explanation: ${condition.explanation}
- Date: ${new Date().toLocaleDateString()}
- Report ID: ${sessionId?.substring(0, 8) || 'N/A'}

Please review and provide your professional guidance.

Best regards,
${userProfile?.first_name || 'Patient'} ${userProfile?.last_name || ''}

Generated by PrescriblyAI`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  if (!diagnoses?.length) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
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
        {diagnoses.map((diagnosis, index) => {
          const probabilityPercent = getProbabilityDisplay(diagnosis.probability);
          const isUrgent = isHighPriority(diagnosis.probability);
          const conditionKey = diagnosis.id || `condition-${index}`;
          const conditionMeds = medications[diagnosis.name] || [];
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`shadow-lg border-2 ${isUrgent ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                        #{index + 1}
                      </span>
                      <span className="text-lg">{diagnosis.name}</span>
                      {isUrgent && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Seek medical attention quickly
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Probability Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Probability</span>
                      <span className="text-sm font-bold">{probabilityPercent}%</span>
                    </div>
                    <Progress 
                      value={probabilityPercent} 
                      className={`h-3 ${isUrgent ? '[&>div]:bg-gradient-to-r [&>div]:from-destructive [&>div]:to-orange-500' : '[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-blue-600'}`}
                    />
                  </div>

                  {/* Explanation */}
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <p className="text-sm leading-relaxed">{diagnosis.explanation}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFetchMedications(conditionKey, diagnosis.name)}
                      disabled={loadingMedications[diagnosis.name]}
                      className="flex items-center gap-2"
                    >
                      <Pill className="h-4 w-4" />
                      {loadingMedications[diagnosis.name] ? 'Loading...' : 'See Recommended Drugs'}
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => onBookDoctor(sessionId)}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Book Doctor
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateConditionPDF(diagnosis)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shareConditionViaWhatsApp(diagnosis)}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shareConditionViaEmail(diagnosis)}
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Medications Accordion */}
                  {conditionMeds.length > 0 && (
                    <Accordion type="single" collapsible>
                      <AccordionItem value={`medications-${index}`} className="border-primary/20">
                        <AccordionTrigger className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary" />
                            For {diagnosis.name} ({conditionMeds.length} medications)
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {conditionMeds.map((medication, medIndex) => (
                              <div key={medIndex} className="border rounded-lg p-4 bg-background space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getFormIcon(medication.form || '')}
                                    <h4 className="font-medium">{medication.drug_name}</h4>
                                  </div>
                                  {medication.form && (
                                    <Badge variant="outline">{medication.form}</Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  {medication.strength && (
                                    <div><span className="font-medium">Strength:</span> {medication.strength}</div>
                                  )}
                                  {medication.dosage && (
                                    <div><span className="font-medium">Dosage:</span> {medication.dosage}</div>
                                  )}
                                  {medication.frequency && (
                                    <div><span className="font-medium">Frequency:</span> {medication.frequency}</div>
                                  )}
                                  {medication.duration && (
                                    <div><span className="font-medium">Duration:</span> {medication.duration}</div>
                                  )}
                                </div>
                                
                                <div className="bg-warning/10 border border-warning/20 rounded p-2 flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-warning">
                                    ⚠️ Consult a healthcare provider before use
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}

                  {/* No medications available */}
                  {medications[diagnosis.name] && conditionMeds.length === 0 && (
                    <div className="text-center p-4 bg-muted/30 rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground mb-2">
                        No recommended drugs available. Please consult a doctor.
                      </p>
                      <Button size="sm" onClick={() => onBookDoctor(sessionId)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Consultation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <Button onClick={onSaveDiagnosis} size="lg" className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Diagnosis to History
        </Button>
      </motion.div>

      {/* Disclaimer */}
      <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 mb-1">Important Medical Disclaimer</p>
              <p className="text-yellow-700">
                This AI assessment is for informational purposes only and should not replace professional medical advice, 
                diagnosis, or treatment. Always consult with a qualified healthcare provider for proper medical evaluation 
                and before taking any medication.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};