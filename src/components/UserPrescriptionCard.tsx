import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, FileText, Download, Share } from "lucide-react";
import { format } from "date-fns";

interface Prescription {
  id: string;
  diagnosis: string | null;
  instructions: string | null;
  medications: any;
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

interface UserPrescriptionCardProps {
  prescription: Prescription;
  onDownload: (prescription: Prescription) => void;
  onShare: (prescription: Prescription) => void;
}

export const UserPrescriptionCard = ({ prescription, onDownload, onShare }: UserPrescriptionCardProps) => {
  const medicationsArray = Array.isArray(prescription.medications) ? prescription.medications : [];
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-primary">
              {prescription.diagnosis || 'Medical Prescription'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(prescription.issued_at), 'PPP')}
            </div>
            {prescription.doctors?.profiles && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <User className="h-4 w-4" />
                Dr. {prescription.doctors.profiles.first_name} {prescription.doctors.profiles.last_name}
              </div>
            )}
          </div>
          <Badge variant={prescription.status === 'active' ? 'default' : 'secondary'}>
            {prescription.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Prescribed Medications ({medicationsArray.length})</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {medicationsArray.slice(0, 3).map((medication: any, index: number) => (
                <div key={index} className="p-2 bg-muted/50 rounded-md">
                  <p className="font-medium text-sm">{medication.name || medication.drug}</p>
                  {medication.dosage && (
                    <p className="text-xs text-muted-foreground">Dosage: {medication.dosage}</p>
                  )}
                  {medication.frequency && (
                    <p className="text-xs text-muted-foreground">Frequency: {medication.frequency}</p>
                  )}
                </div>
              ))}
              {medicationsArray.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{medicationsArray.length - 3} more medications
                </p>
              )}
            </div>
          </div>
          
          {prescription.instructions && (
            <div>
              <h4 className="font-medium text-sm mb-1">Instructions</h4>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {prescription.instructions}
              </p>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => onDownload(prescription)}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onShare(prescription)}>
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};