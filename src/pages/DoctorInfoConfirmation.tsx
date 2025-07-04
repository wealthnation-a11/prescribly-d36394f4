import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Stethoscope, Shield, FileText, MapPin, AlertTriangle } from "lucide-react";

export const DoctorInfoConfirmation = () => {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (agreed) {
      navigate("/doctor-register");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <span className="text-2xl font-bold">Prescribly</span>
          </div>
          <CardTitle className="text-2xl">Before You Proceed with Registration</CardTitle>
          <p className="text-muted-foreground">Please carefully read and agree to the conditions below.</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <p className="text-foreground">
                Ensure that all documents uploaded are <strong>correct, authentic, and valid</strong>.
              </p>
            </div>

            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-destructive mb-2">Falsification of any credential can result in:</p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full flex-shrink-0"></span>
                      <span>Immediate termination of your application</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full flex-shrink-0"></span>
                      <span>Being reported to the Medical Bureau or governing body</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <p className="text-foreground">
                Your location will be used to <strong>match you with nearby patients</strong>.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-success-green/10 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-success-green" />
              </div>
              <p className="text-foreground">
                Your data is handled under <strong>strict compliance</strong> with NDPR, HIPAA, and other privacy laws.
              </p>
            </div>
          </div>

          <div className="bg-accent/50 p-4 rounded-lg border border-accent">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="doctor-agreement"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="doctor-agreement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I confirm that the information and documents I provide are accurate. I understand that falsified details may result in termination and legal reporting.
              </label>
            </div>
          </div>

          <Button 
            onClick={handleContinue}
            disabled={!agreed}
            className="w-full bg-success-green hover:bg-success-green/90"
            size="lg"
          >
            Continue to Doctor Registration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};