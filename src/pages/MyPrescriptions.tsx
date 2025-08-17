import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { 
  Pill, 
  Calendar, 
  Trash2, 
  Share2, 
  Download, 
  FileText,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';
import jsPDF from 'jspdf';

interface WellnessCheck {
  id: string;
  entered_symptoms: string[];
  calculated_probabilities: any;
  suggested_drugs: any;
  age: number;
  gender: string;
  duration: string;
  created_at: string;
}

const MyPrescriptions = () => {
  usePageSEO({
    title: "My Prescriptions - Prescribly",
    description: "View and manage your saved prescriptions and wellness check results",
    canonicalPath: "/my-prescriptions"
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<WellnessCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wellness_checks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load prescriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePrescription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('wellness_checks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrescriptions(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Deleted",
        description: "Prescription removed successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete prescription",
        variant: "destructive"
      });
    }
  };

  const generatePDF = (prescription: WellnessCheck, isFullHistory = false) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 30;

    // Header with logo placeholder and title
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246); // Primary blue
    doc.text('Prescribly', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Doctor in Your Pocket', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;
    doc.setTextColor(0, 0, 0);

    if (isFullHistory) {
      doc.setFontSize(18);
      doc.text('Complete Prescription History', 20, yPosition);
      yPosition += 20;

      prescriptions.forEach((presc, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }

        doc.setFontSize(14);
        doc.text(`Prescription ${index + 1}`, 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.text(`Date: ${new Date(presc.created_at).toLocaleDateString()}`, 20, yPosition);
        yPosition += 8;

        const topCondition = presc.calculated_probabilities[0];
        if (topCondition) {
          doc.text(`Condition: ${topCondition.condition}`, 20, yPosition);
          yPosition += 8;
        }

        doc.text('Medications:', 20, yPosition);
        yPosition += 6;
        presc.suggested_drugs.forEach((drug: any) => {
          doc.text(`• ${drug.drug || drug}`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 10;
      });
    } else {
      // Single prescription
      doc.setFontSize(16);
      doc.text('Medical Prescription', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(12);
      doc.text(`Date: ${new Date(prescription.created_at).toLocaleDateString()}`, 20, yPosition);
      yPosition += 10;

      doc.text(`Patient Age: ${prescription.age}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Gender: ${prescription.gender}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Duration: ${prescription.duration}`, 20, yPosition);
      yPosition += 15;

      const topCondition = prescription.calculated_probabilities[0];
      if (topCondition) {
        doc.setFontSize(14);
        doc.text('Diagnosis:', 20, yPosition);
        yPosition += 8;
        doc.setFontSize(12);
        doc.text(topCondition.condition, 20, yPosition);
        yPosition += 15;
      }

      doc.setFontSize(14);
      doc.text('Prescribed Medications:', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      prescription.suggested_drugs.forEach((drug: any) => {
        const drugName = typeof drug === 'object' && drug?.drug ? drug.drug : (typeof drug === 'string' ? drug : 'Unknown medication');
        doc.text(`• ${drugName}`, 25, yPosition);
        yPosition += 8;
      });
    }

    // Footer with disclaimer
    yPosition = doc.internal.pageSize.getHeight() - 40;
    doc.setFontSize(10);
    doc.setTextColor(200, 0, 0);
    doc.text('DISCLAIMER: This prescription was generated by AI for informational purposes only.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
    doc.text('Always consult a licensed medical professional before taking any medication.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setTextColor(100, 100, 100);
    doc.text('Prescribly - Contact: support@prescribly.com', pageWidth / 2, yPosition, { align: 'center' });

    const filename = isFullHistory 
      ? 'Prescribly_Complete_History.pdf'
      : `Prescribly_Prescription_${new Date(prescription.created_at).toLocaleDateString().replace(/\//g, '-')}.pdf`;
    
    doc.save(filename);

    toast({
      title: "Downloaded",
      description: `${isFullHistory ? 'Complete history' : 'Prescription'} PDF saved successfully`
    });
  };

  const shareViaWhatsApp = (prescription: WellnessCheck) => {
    const topCondition = prescription.calculated_probabilities[0];
    const message = `Prescription from Prescribly:\n\nDate: ${new Date(prescription.created_at).toLocaleDateString()}\nCondition: ${topCondition?.condition || 'N/A'}\n\nMedications:\n${prescription.suggested_drugs.map((drug: any) => {
      const drugName = typeof drug === 'object' && drug?.drug ? drug.drug : (typeof drug === 'string' ? drug : 'Unknown medication');
      return `• ${drugName}`;
    }).join('\n')}\n\n⚠️ Always consult a licensed medical professional before taking medication.`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const shareViaEmail = (prescription: WellnessCheck) => {
    const topCondition = prescription.calculated_probabilities[0];
    const subject = 'Prescription from Prescribly';
    const body = `Prescription Details:\n\nDate: ${new Date(prescription.created_at).toLocaleDateString()}\nCondition: ${topCondition?.condition || 'N/A'}\n\nMedications:\n${prescription.suggested_drugs.map((drug: any) => {
      const drugName = typeof drug === 'object' && drug?.drug ? drug.drug : (typeof drug === 'string' ? drug : 'Unknown medication');
      return `• ${drugName}`;
    }).join('\n')}\n\n⚠️ DISCLAIMER: This prescription was generated by AI for informational purposes only. Always consult a licensed medical professional before taking any medication.`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-background/50 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading prescriptions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-background/50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/user-dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">My Prescriptions</h1>
              <p className="text-muted-foreground">View and manage your saved wellness check results</p>
            </div>
          </div>
          
          {prescriptions.length > 0 && (
            <Button 
              onClick={() => generatePDF(prescriptions[0], true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Full History
            </Button>
          )}
        </div>

        {/* Prescriptions List */}
        {prescriptions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Prescriptions Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by using our Wellness Checker to get AI-powered health assessments
              </p>
              <Button onClick={() => navigate('/wellness-checker')}>
                <Pill className="h-4 w-4 mr-2" />
                Start Wellness Check
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {prescriptions.map((prescription) => {
              const probabilities = Array.isArray(prescription.calculated_probabilities) 
                ? prescription.calculated_probabilities 
                : [];
              const topCondition = probabilities[0];
              
              return (
                <Card key={prescription.id} className="border-l-4 border-l-primary/50 hover:shadow-lg transition-shadow">
                  <CardContent className="p-8">
                    {/* Date Badge */}
                    <div className="flex justify-between items-start mb-6">
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(prescription.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Badge>
                      <FileText className="h-6 w-6 text-primary" />
                    </div>

                    {/* Diagnosis Header */}
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-700 mb-4">
                        Diagnosis:
                      </h2>
                      <h1 className="text-4xl font-bold text-black">
                        {topCondition?.condition || 'Wellness Check'}
                      </h1>
                    </div>

                    {/* Patient Info */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg mb-8">
                      <div>
                        <p className="text-sm text-muted-foreground">Age</p>
                        <p className="font-medium">{prescription.age} years</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{prescription.gender}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{prescription.duration}</p>
                      </div>
                    </div>

                    {/* Prescription Section */}
                    <div className="space-y-6 mb-8">
                      <h3 className="text-2xl font-bold text-gray-700">
                        Prescription:
                      </h3>
                      
                      {/* Medications */}
                      <div className="space-y-6">
                        {(Array.isArray(prescription.suggested_drugs) ? prescription.suggested_drugs : [])?.map((drug: any, index: number) => {
                          const drugName = typeof drug === 'object' && drug?.drug ? drug.drug : (typeof drug === 'string' ? drug : 'Unknown medication');
                          return (
                            <div key={index} className="space-y-3">
                              {/* Drug Name with Arrow */}
                              <div className="flex items-center gap-4">
                                <h4 className="text-2xl font-bold text-black">
                                  {drugName}
                                </h4>
                                <span className="text-2xl text-gray-400">→</span>
                              </div>
                              
                              {/* Usage placeholder - could be enhanced with actual usage data */}
                              <p className="text-xl text-gray-700 leading-relaxed">
                                Follow doctor's instructions for proper dosage
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generatePDF(prescription)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareViaWhatsApp(prescription)}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => shareViaEmail(prescription)}
                        className="flex items-center gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Email
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePrescription(prescription.id)}
                        className="ml-auto flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPrescriptions;