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
  Mail
} from 'lucide-react';

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
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
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
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Fetch doctor profiles separately
        const prescriptionsWithDoctors = await Promise.all(
          (data || []).map(async (prescription) => {
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
        
        setPrescriptions(prescriptionsWithDoctors);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch prescriptions.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, []);

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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {prescriptions.map((prescription) => (
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
                    <div className="space-y-3">
                      <div>
                        <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>
                          {prescription.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Medications:</h4>
                        {Array.isArray(prescription.medications) && prescription.medications.slice(0, 3).map((drug: any, index: number) => (
                          <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                            <span className="font-medium">{drug.name || drug.drug}</span>
                            {drug.dosage && <Badge variant="outline" className="ml-2 text-xs">{drug.dosage}</Badge>}
                          </div>
                        ))}
                      </div>
                      {prescription.instructions && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Instructions:</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {prescription.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default MyPrescriptions;