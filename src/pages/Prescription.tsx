import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, ArrowLeft, FileText, User, Pill, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { usePageSEO } from "@/hooks/usePageSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from 'jspdf';

interface PrescriptionData {
  id?: string;
  patient_info?: {
    name?: string;
    age?: number;
    gender?: string;
    dateOfBirth?: string;
  };
  symptoms?: string[];
  diagnosis?: string;
  prescription?: {
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
  };
  instructions?: string;
  created_at?: string;
  safety_flags?: string[];
}

export default function Prescription() {
  usePageSEO({
    title: "Prescription Results | Prescribly",
    description: "View and download your prescription results from the wellness assessment",
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First check if data was passed via navigation state
    const stateData = location.state?.prescriptionData;
    if (stateData) {
      setPrescriptionData(stateData);
      setLoading(false);
      return;
    }

    // If no state data, try to fetch the latest wellness check result
    fetchLatestResult();
  }, [location.state, user]);

  const fetchLatestResult = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wellness_check_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching prescription:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        setPrescriptionData({
          id: result.id,
          patient_info: result.patient_info as any,
          symptoms: result.symptoms,
          diagnosis: result.diagnosis,
          prescription: result.prescription as any,
          instructions: result.instructions,
          created_at: result.created_at
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadAsPDF = () => {
    if (!prescriptionData) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Prescribly Health Assessment', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Patient Info
      if (prescriptionData.patient_info) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Patient Information', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        if (prescriptionData.patient_info.name) {
          doc.text(`Name: ${prescriptionData.patient_info.name}`, 20, yPosition);
          yPosition += 7;
        }
        if (prescriptionData.patient_info.age) {
          doc.text(`Age: ${prescriptionData.patient_info.age}`, 20, yPosition);
          yPosition += 7;
        }
        if (prescriptionData.patient_info.gender) {
          doc.text(`Gender: ${prescriptionData.patient_info.gender}`, 20, yPosition);
          yPosition += 7;
        }
        yPosition += 10;
      }

      // Symptoms
      if (prescriptionData.symptoms && prescriptionData.symptoms.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Reported Symptoms', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        prescriptionData.symptoms.forEach((symptom) => {
          doc.text(`• ${symptom}`, 25, yPosition);
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Diagnosis
      if (prescriptionData.diagnosis) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Diagnosis', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const diagnosisLines = doc.splitTextToSize(prescriptionData.diagnosis, pageWidth - 40);
        diagnosisLines.forEach((line: string) => {
          doc.text(line, 20, yPosition);
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Prescription
      if (prescriptionData.prescription?.medications && prescriptionData.prescription.medications.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Prescription', 20, yPosition);
        yPosition += 10;

        prescriptionData.prescription.medications.forEach((medication, index) => {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${index + 1}. ${medication.name}`, 20, yPosition);
          yPosition += 8;

          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.text(`Dosage: ${medication.dosage}`, 25, yPosition);
          yPosition += 6;
          doc.text(`Frequency: ${medication.frequency}`, 25, yPosition);
          yPosition += 6;
          doc.text(`Duration: ${medication.duration}`, 25, yPosition);
          yPosition += 6;

          if (medication.instructions) {
            const instructionLines = doc.splitTextToSize(`Instructions: ${medication.instructions}`, pageWidth - 50);
            instructionLines.forEach((line: string) => {
              doc.text(line, 25, yPosition);
              yPosition += 6;
            });
          }
          yPosition += 8;
        });
      }

      // Instructions
      if (prescriptionData.instructions) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Additional Instructions', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const instructionLines = doc.splitTextToSize(prescriptionData.instructions, pageWidth - 40);
        instructionLines.forEach((line: string) => {
          doc.text(line, 20, yPosition);
          yPosition += 7;
        });
        yPosition += 15;
      }

      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('This prescription was generated by an AI-powered assessment system.', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      doc.text('Please consult with a healthcare professional before taking any medications.', pageWidth / 2, yPosition, { align: 'center' });

      // Generate filename
      const patientName = prescriptionData.patient_info?.name || 'Patient';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Prescription_${patientName.replace(/\s+/g, '_')}_${date}.pdf`;

      doc.save(filename);

      toast({
        title: "Download Complete",
        description: "Your prescription has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download prescription. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-6 w-6" />
                Loading Prescription Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please wait while we load your prescription results...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!prescriptionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-6 w-6" />
                No Prescription Data Available
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Please complete the wellness check first.
              </p>
              <Button 
                onClick={() => navigate('/wellness-checker')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Start Wellness Check
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={downloadAsPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download Prescription
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Patient Info */}
          {prescriptionData.patient_info && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {prescriptionData.patient_info.name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg">{prescriptionData.patient_info.name}</p>
                  </div>
                )}
                {prescriptionData.patient_info.age && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Age</label>
                    <p className="text-lg">{prescriptionData.patient_info.age}</p>
                  </div>
                )}
                {prescriptionData.patient_info.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-lg">{prescriptionData.patient_info.gender}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Symptoms */}
          {prescriptionData.symptoms && prescriptionData.symptoms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reported Symptoms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {prescriptionData.symptoms.map((symptom, index) => (
                    <Badge key={index} variant="secondary">{symptom}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnosis */}
          {prescriptionData.diagnosis && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{prescriptionData.diagnosis}</p>
              </CardContent>
            </Card>
          )}

          {/* Prescription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Prescription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {prescriptionData.prescription?.medications && prescriptionData.prescription.medications.length > 0 ? (
                <div className="space-y-4">
                  {prescriptionData.prescription.medications.map((medication, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-lg mb-3">{medication.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Dosage</label>
                          <p>{medication.dosage}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                          <p>{medication.frequency}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Duration</label>
                          <p>{medication.duration}</p>
                        </div>
                      </div>
                      {medication.instructions && (
                        <div className="mt-3">
                          <label className="text-sm font-medium text-muted-foreground">Instructions</label>
                          <p className="mt-1">{medication.instructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No specific medications prescribed. Please follow general instructions below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Instructions */}
          {prescriptionData.instructions && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed">{prescriptionData.instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Safety Flags */}
          {prescriptionData.safety_flags && prescriptionData.safety_flags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  Safety Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prescriptionData.safety_flags.map((flag, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">{flag}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assessment Date */}
          {prescriptionData.created_at && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Assessment Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {new Date(prescriptionData.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-muted-foreground">Important Notice</h3>
                <p className="text-sm text-muted-foreground">
                  This prescription was generated by an AI-powered assessment system. 
                  Please consult with a healthcare professional before taking any medications. 
                  This document is for informational purposes only and should not replace 
                  professional medical advice, diagnosis, or treatment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}