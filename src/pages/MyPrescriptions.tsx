import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Pill, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const MyPrescriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        const [prescRes, aiRes] = await Promise.all([
          supabase
            .from('prescriptions')
            .select('*')
            .eq('patient_id', user.id)
            .order('issued_at', { ascending: false }),
          supabase
            .from('patient_prescriptions')
            .select('id, medications, diagnosis, created_at, status')
            .eq('patient_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        const presc = prescRes.data || [];
        const aiPresc = aiRes.data || [];
        if (prescRes.error) console.error('Error fetching prescriptions:', prescRes.error);
        if (aiRes.error) console.error('Error fetching AI prescriptions:', aiRes.error);

        const mappedAi = aiPresc.map((p: any) => ({
          id: p.id,
          doctor_name: 'AI Assistant',
          diagnosis: (p.diagnosis?.name) || 'Wellness Assessment',
          medications: p.medications || [],
          issued_at: p.created_at,
          status: p.status || 'generated',
          source: 'ai'
        }));

        setPrescriptions([...(presc as any[]), ...mappedAi]);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrescriptions();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'needs_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'generated':
      case 'dispensed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const mockPrescriptions = [
    {
      id: '1',
      doctor_name: 'AI Assistant',
      diagnosis: 'Upper Respiratory Infection',
      medications: [
        { name: 'Paracetamol 500mg', dosage: '1 tablet every 6 hours', duration: '5 days' },
        { name: 'Throat Lozenges', dosage: 'As needed', duration: 'Until symptoms resolve' }
      ],
      issued_at: new Date().toISOString(),
      status: 'pending'
    }
  ];

  const displayPrescriptions = prescriptions;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-medical-blue p-4 text-white">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Pill className="w-5 h-5" />
            <h1 className="text-lg font-semibold">My Prescriptions</h1>
          </div>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="max-w-md mx-auto p-6">
        {displayPrescriptions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Prescriptions Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Your prescriptions will appear here after consultations
              </p>
              <Button onClick={() => navigate('/symptom-form')}>
                Check Symptoms
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayPrescriptions.map((prescription, index) => (
              <Card key={prescription.id || index}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {prescription.diagnosis || 'Medical Consultation'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        By {prescription.doctor_name || prescription.doctors?.first_name || 'AI Assistant'}
                      </p>
                    </div>
                    <Badge className={getStatusColor(prescription.status)}>
                      {prescription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(prescription.issued_at).toLocaleDateString()}
                    </div>

                    {/* Medications */}
                    <div>
                      <h4 className="font-medium mb-2">Medications:</h4>
                      <div className="space-y-2">
                        {(prescription.medications || []).map((med: any, medIndex: number) => (
                          <div key={medIndex} className="bg-accent/50 p-3 rounded-lg">
                            <p className="font-medium text-sm">{med.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {med.dosage} • {med.duration}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instructions */}
                    {prescription.instructions && (
                      <div>
                        <h4 className="font-medium mb-1">Instructions:</h4>
                        <p className="text-sm text-muted-foreground">
                          {prescription.instructions}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      {prescription.source === 'ai' ? (
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/prescriptions/print/${prescription.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View / Print
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  );
};

export default MyPrescriptions;