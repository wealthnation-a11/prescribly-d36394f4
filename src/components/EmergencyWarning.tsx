import { AlertTriangle, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmergencyWarningProps {
  flags: string[];
  severity: number;
  onAcknowledge: () => void;
}

export const EmergencyWarning = ({ flags, severity, onAcknowledge }: EmergencyWarningProps) => {
  const emergencyNumbers = [
    { name: "Emergency Services", number: "911" },
    { name: "Poison Control", number: "1-800-222-1222" },
    { name: "Crisis Hotline", number: "988" }
  ];

  return (
    <Card className="border-red-500 bg-red-50 shadow-lg">
      <CardHeader className="bg-red-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          🚨 EMERGENCY SYMPTOMS DETECTED
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <Alert className="border-red-400 bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800 font-semibold">
            Your symptoms may indicate a medical emergency. Please seek immediate medical attention.
            Do not wait for online diagnosis or treatment.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h3 className="font-semibold text-red-800">Emergency Indicators Detected:</h3>
          <ul className="list-disc list-inside space-y-1">
            {flags.map((flag, index) => (
              <li key={index} className="text-red-700">{flag}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-red-800">Immediate Actions:</h3>
          <ul className="list-disc list-inside space-y-1 text-red-700">
            <li>Call emergency services immediately</li>
            <li>Do not drive yourself to the hospital</li>
            <li>If available, have someone stay with you</li>
            <li>Gather important medical information and medications</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {emergencyNumbers.map((contact, index) => (
            <Button
              key={index}
              variant="destructive"
              className="flex items-center gap-2"
              onClick={() => window.location.href = `tel:${contact.number}`}
            >
              <Phone className="h-4 w-4" />
              {contact.name}
            </Button>
          ))}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-3">
            By clicking "I Understand", you acknowledge that you have been advised to seek immediate medical attention.
            This system cannot provide emergency medical care.
          </p>
          <Button 
            onClick={onAcknowledge}
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-50"
          >
            I Understand - I Will Seek Emergency Care
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};