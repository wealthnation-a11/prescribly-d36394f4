import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import type { Json } from '@/integrations/supabase/types';
import { 
  Pill, 
  Download, 
  Trash2, 
  Share, 
  Calendar,
  ArrowLeft,
  FileText,
  Mail,
  MessageCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface Prescription {
  id: string;
  diagnosis: string | null;
  instructions: string | null;
  medications: Json;
  status: string;
  issued_at: string;
  created_at: string;
  doctors?: {
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
}

const MyPrescriptions = () => {
  usePageSEO({
    title: "My Prescriptions - Prescribly",
    description: "View and manage your saved prescriptions from AI consultations.",
    canonicalPath: "/my-prescriptions"
  });

  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const generatePDF = async (prescription: Prescription) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246);
      pdf.text('PrescriblyAI', 20, 30);
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Medical Prescription Report', 20, 40);
      
      // Line separator
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 45, pageWidth - 20, 45);
      
      let yPos = 60;
      
      // Prescription Information
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Prescription Details', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Diagnosis: ${prescription.diagnosis || 'N/A'}`, 20, yPos);
      yPos += 8;
      pdf.text(`Date Issued: ${new Date(prescription.issued_at).toLocaleDateString()}`, 20, yPos);
      yPos += 8;
      pdf.text(`Status: ${prescription.status}`, 20, yPos);
      yPos += 8;
      
      if (prescription.doctors?.profiles) {
        pdf.text(`Prescribed by: Dr. ${prescription.doctors.profiles.first_name} ${prescription.doctors.profiles.last_name}`, 20, yPos);
        yPos += 8;
      }
      yPos += 10;
      
      // Medications
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Prescribed Medications', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      
      if (Array.isArray(prescription.medications)) {
        prescription.medications.forEach((drug: any, index: number) => {
          pdf.setFont(undefined, 'bold');
          pdf.text(`${index + 1}. ${drug.name || drug.drug}`, 20, yPos);
          yPos += 8;
          
          pdf.setFont(undefined, 'normal');
          if (drug.strength) pdf.text(`   Strength: ${drug.strength}`, 20, yPos), yPos += 6;
          if (drug.dosage) pdf.text(`   Dosage: ${drug.dosage}`, 20, yPos), yPos += 6;
          if (drug.frequency) pdf.text(`   Frequency: ${drug.frequency}`, 20, yPos), yPos += 6;
          if (drug.duration) pdf.text(`   Duration: ${drug.duration}`, 20, yPos), yPos += 6;
          if (drug.instructions) pdf.text(`   Instructions: ${drug.instructions}`, 20, yPos), yPos += 6;
          
          yPos += 5;
          
          if (yPos > 250) {
            pdf.addPage();
            yPos = 30;
          }
        });
      }
      
      // Instructions
      if (prescription.instructions) {
        yPos += 10;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('General Instructions', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const instructions = pdf.splitTextToSize(prescription.instructions, pageWidth - 40);
        pdf.text(instructions, 20, yPos);
        yPos += instructions.length * 6;
      }
      
      // Disclaimer
      yPos += 20;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      const disclaimer = 'IMPORTANT: This prescription is AI-generated. Always consult with a qualified healthcare professional before taking any medication.';
      const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 40);
      pdf.text(disclaimerLines, 20, yPos);
      
      // Footer
      yPos += 20;
      pdf.text(`Generated by PrescriblyAI on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPos);
      
      pdf.save(`prescription-${prescription.id.substring(0, 8)}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const shareViaWhatsApp = (prescription: Prescription) => {
    const doctorName = prescription.doctors?.profiles 
      ? `Dr. ${prescription.doctors.profiles.first_name} ${prescription.doctors.profiles.last_name}`
      : 'Doctor';
    
    let message = `🏥 *PrescriblyAI - Medical Prescription*\n\n`;
    message += `📅 *Date:* ${new Date(prescription.issued_at).toLocaleDateString()}\n`;
    message += `👨‍⚕️ *Prescribed by:* ${doctorName}\n`;
    message += `🔍 *Diagnosis:* ${prescription.diagnosis || 'N/A'}\n\n`;
    
    message += `💊 *Prescribed Medications:*\n`;
    if (Array.isArray(prescription.medications)) {
      prescription.medications.forEach((drug: any, index: number) => {
        message += `${index + 1}. *${drug.name || drug.drug}*\n`;
        if (drug.strength) message += `   • Strength: ${drug.strength}\n`;
        if (drug.dosage) message += `   • Dosage: ${drug.dosage}\n`;
        if (drug.frequency) message += `   • Frequency: ${drug.frequency}\n`;
        if (drug.duration) message += `   • Duration: ${drug.duration}\n`;
        message += `\n`;
      });
    }
    
    if (prescription.instructions) {
      message += `📝 *Instructions:* ${prescription.instructions}\n\n`;
    }
    
    message += `⚠️ *Disclaimer:* This prescription is AI-generated. Always consult with a qualified healthcare professional.\n\n`;
    message += `Generated by PrescriblyAI - ${new Date().toLocaleDateString()}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = (prescription: Prescription) => {
    const doctorName = prescription.doctors?.profiles 
      ? `Dr. ${prescription.doctors.profiles.first_name} ${prescription.doctors.profiles.last_name}`
      : 'Doctor';
    
    const subject = `Medical Prescription - ${prescription.diagnosis || 'Health Report'}`;
    
    let body = `PrescriblyAI Medical Prescription Report\n\n`;
    body += `Date Issued: ${new Date(prescription.issued_at).toLocaleDateString()}\n`;
    body += `Prescribed by: ${doctorName}\n`;
    body += `Diagnosis: ${prescription.diagnosis || 'N/A'}\n`;
    body += `Status: ${prescription.status}\n\n`;
    
    body += `PRESCRIBED MEDICATIONS:\n`;
    body += `------------------------\n`;
    if (Array.isArray(prescription.medications)) {
      prescription.medications.forEach((drug: any, index: number) => {
        body += `${index + 1}. ${drug.name || drug.drug}\n`;
        if (drug.strength) body += `   Strength: ${drug.strength}\n`;
        if (drug.dosage) body += `   Dosage: ${drug.dosage}\n`;
        if (drug.frequency) body += `   Frequency: ${drug.frequency}\n`;
        if (drug.duration) body += `   Duration: ${drug.duration}\n`;
        if (drug.instructions) body += `   Instructions: ${drug.instructions}\n`;
        body += `\n`;
      });
    }
    
    if (prescription.instructions) {
      body += `GENERAL INSTRUCTIONS:\n`;
      body += `--------------------\n`;
      body += `${prescription.instructions}\n\n`;
    }
    
    body += `IMPORTANT DISCLAIMER:\n`;
    body += `--------------------\n`;
    body += `This prescription is AI-generated for informational purposes only. Always consult with a qualified healthcare professional before taking any medication or making health decisions.\n\n`;
    body += `Generated by PrescriblyAI on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Fetch from multiple prescription tables to get all prescribed drugs
        const [regularPrescriptions, patientPrescriptions, v2Prescriptions] = await Promise.all([
          // Regular prescriptions table
          supabase
            .from('prescriptions')
            .select(`
              id,
              diagnosis,
              instructions,
              medications,
              status,
              issued_at,
              created_at,
              doctor_id
            `)
            .eq('patient_id', user.id)
            .order('created_at', { ascending: false }),
          
          // Patient prescriptions table
          supabase
            .from('patient_prescriptions')
            .select(`
              id,
              diagnosis,
              medications,
              status,
              created_at,
              updated_at,
              patient_id
            `)
            .eq('patient_id', user.id)
            .order('created_at', { ascending: false }),
          
          // Prescriptions v2 table (if exists)
          supabase
            .from('prescriptions_v2')
            .select(`
              id,
              diagnosis_id,
              medications,
              status,
              created_at,
              updated_at,
              doctor_id
            `)
            .eq('patient_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        let allPrescriptions: Prescription[] = [];

        // Process regular prescriptions
        if (regularPrescriptions.data) {
          const prescriptionsWithDoctors = await Promise.all(
            regularPrescriptions.data.map(async (prescription) => {
              const { data: doctorProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('user_id', prescription.doctor_id)
                .single();
              
              return {
                ...prescription,
                doctors: {
                  profiles: doctorProfile
                }
              };
            })
          );
          allPrescriptions = [...allPrescriptions, ...prescriptionsWithDoctors];
        }

        // Process patient prescriptions
        if (patientPrescriptions.data) {
          const formattedPatientPrescriptions = patientPrescriptions.data.map(prescription => ({
            id: prescription.id,
            diagnosis: typeof prescription.diagnosis === 'string' ? prescription.diagnosis : 
                      (prescription.diagnosis as any)?.condition || 'AI Generated Prescription',
            instructions: 'Follow medication instructions as prescribed',
            medications: prescription.medications,
            status: prescription.status,
            issued_at: prescription.created_at,
            created_at: prescription.created_at,
            doctors: {
              profiles: {
                first_name: 'AI',
                last_name: 'Assistant'
              }
            }
          }));
          allPrescriptions = [...allPrescriptions, ...formattedPatientPrescriptions];
        }

        // Sort all prescriptions by date
        allPrescriptions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setPrescriptions(allPrescriptions);
      } catch (error: any) {
        console.error('Error fetching prescriptions:', error);
        toast.error(error.message || "Failed to fetch prescriptions.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-background/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-background/50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-primary">My Prescriptions</h1>
            <p className="text-muted-foreground">Your saved AI consultations</p>
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <div className="text-center py-16">
            <Pill className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Prescriptions Yet</h2>
            <p className="text-muted-foreground mb-6">Book an appointment with a doctor to get your first prescription.</p>
            <Button onClick={() => navigate('/book-appointment')} size="lg">
              Book Appointment
            </Button>
          </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {prescriptions.map((prescription) => {
                const isExpanded = expandedCards.has(prescription.id);
                const medicationsArray = Array.isArray(prescription.medications) ? prescription.medications : [];
                const displayedMedications = isExpanded ? medicationsArray : medicationsArray.slice(0, 3);
                
                return (
                  <Card key={prescription.id} className="animate-fade-in">
                    <CardHeader>
                      <CardTitle className="text-xl text-primary">
                        {prescription.diagnosis || 'Medical Prescription'}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(prescription.issued_at).toLocaleDateString()}
                      </div>
                      {prescription.doctors?.profiles && (
                        <p className="text-sm text-muted-foreground">
                          By Dr. {prescription.doctors.profiles.first_name} {prescription.doctors.profiles.last_name}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Badge variant={prescription.status === 'active' || prescription.status === 'pending' ? 'default' : 'secondary'}>
                            {prescription.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">
                              All Prescribed Medications ({medicationsArray.length})
                            </h4>
                            {medicationsArray.length > 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCardExpansion(prescription.id)}
                                className="flex items-center gap-1 text-xs"
                              >
                                {isExpanded ? (
                                  <>
                                    <EyeOff className="h-3 w-3" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    Show All
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {displayedMedications.map((drug: any, index: number) => (
                              <div key={index} className="text-sm bg-secondary/20 p-3 rounded-lg border">
                                <div className="font-medium text-foreground mb-1">
                                  {drug.name || drug.drug || `Medication ${index + 1}`}
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                  {drug.strength && (
                                    <div><strong>Strength:</strong> {drug.strength}</div>
                                  )}
                                  {drug.dosage && (
                                    <div><strong>Dosage:</strong> {drug.dosage}</div>
                                  )}
                                  {drug.frequency && (
                                    <div><strong>Frequency:</strong> {drug.frequency}</div>
                                  )}
                                  {drug.duration && (
                                    <div><strong>Duration:</strong> {drug.duration}</div>
                                  )}
                                </div>
                                {drug.instructions && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    <strong>Instructions:</strong> {drug.instructions}
                                  </div>
                                )}
                                {drug.warnings && (
                                  <div className="mt-1 text-xs text-red-600">
                                    <strong>⚠️ Warning:</strong> {drug.warnings}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {!isExpanded && medicationsArray.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{medicationsArray.length - 3} more medications
                            </p>
                          )}
                        </div>

                        {prescription.instructions && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">General Instructions:</h4>
                            <p className="text-xs text-muted-foreground bg-secondary/10 p-2 rounded">
                              {prescription.instructions}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-border">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generatePDF(prescription)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => shareViaWhatsApp(prescription)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-700"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => shareViaEmail(prescription)}
                              className="flex items-center gap-1"
                            >
                              <Mail className="h-3 w-3" />
                              Email
                            </Button>
                          </div>
                        </div>
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