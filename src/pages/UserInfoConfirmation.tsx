import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Stethoscope, Shield, FileText, MapPin } from "lucide-react";

export const UserInfoConfirmation = () => {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (agreed) {
      navigate("/register");
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
          <p className="text-muted-foreground">Please read the following carefully.</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-semibold">1</span>
              </div>
              <p className="text-foreground">
                Make sure the information you provide is <strong>accurate and true</strong>.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <p className="text-foreground">
                The information will be used to <strong>match you with verified doctors</strong> in your location.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                <span className="text-destructive font-semibold">!</span>
              </div>
              <p className="text-foreground">
                False or misleading data may result in <strong>incorrect medical advice or app suspension</strong>.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-success-green/10 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-success-green" />
              </div>
              <p className="text-foreground">
                Your health records will be protected under <strong>strict privacy rules</strong> in line with NDPR, HIPAA, and GDPR where applicable.
              </p>
            </div>
          </div>

          <div className="bg-accent/50 p-4 rounded-lg border border-accent">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="agreement"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="agreement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I confirm that the information I will provide is accurate and I agree to Prescribly's confidentiality policy.
              </label>
            </div>
          </div>

          <Button 
            onClick={handleContinue}
            disabled={!agreed}
            className="w-full"
            variant="medical"
            size="lg"
          >
            Continue to Registration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};