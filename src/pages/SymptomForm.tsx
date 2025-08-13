import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SymptomForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    mainSymptom: "",
    additionalSymptoms: "",
    duration: "",
    severity: [3],
    recentEvents: "",
    confirmed: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.confirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that your information is accurate.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.mainSymptom.trim()) {
      toast({
        title: "Main Symptom Required",
        description: "Please describe your main symptom.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('symptom_logs')
        .insert({
          user_id: user?.id,
          main_symptom: formData.mainSymptom,
          additional_symptoms: formData.additionalSymptoms,
          duration: formData.duration,
          severity: formData.severity[0],
          recent_events: formData.recentEvents
        });

      if (error) throw error;

      toast({
        title: "Symptoms Recorded",
        description: "Starting wellness assessment...",
      });

      // Navigate to wellness checker with form data
      navigate('/wellness-checker', { 
        state: { 
          symptomData: formData 
        } 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save symptoms. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityLabels = ["Very Mild", "Mild", "Moderate", "Severe", "Very Severe"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary p-4 text-white">
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
            <Stethoscope className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Symptom Checker</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Tell us about your symptoms
            </CardTitle>
            <p className="text-center text-muted-foreground text-sm">
              Please provide accurate information for better diagnosis
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Main Symptom */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Main Symptom <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., fever, headache, cough"
                  value={formData.mainSymptom}
                  onChange={(e) => setFormData({
                    ...formData,
                    mainSymptom: e.target.value
                  })}
                  required
                />
              </div>

              {/* Additional Symptoms */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional Symptoms
                </label>
                <Textarea
                  placeholder="Describe any other symptoms you're experiencing..."
                  value={formData.additionalSymptoms}
                  onChange={(e) => setFormData({
                    ...formData,
                    additionalSymptoms: e.target.value
                  })}
                  rows={3}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  How long have you had these symptoms?
                </label>
                <Select 
                  value={formData.duration} 
                  onValueChange={(value) => setFormData({
                    ...formData,
                    duration: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less-than-24h">Less than 24 hours</SelectItem>
                    <SelectItem value="1-3-days">1-3 days</SelectItem>
                    <SelectItem value="4-7-days">4-7 days</SelectItem>
                    <SelectItem value="1-2-weeks">1-2 weeks</SelectItem>
                    <SelectItem value="more-than-2-weeks">More than 2 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Severity Level
                </label>
                <div className="px-3">
                  <Slider
                    value={formData.severity}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      severity: value
                    })}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Very Mild</span>
                    <span className="font-medium text-foreground">
                      {severityLabels[formData.severity[0] - 1]}
                    </span>
                    <span>Very Severe</span>
                  </div>
                </div>
              </div>

              {/* Recent Events */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Recent Events or Travel
                </label>
                <Textarea
                  placeholder="Any recent travel, exposure to illness, or significant events?"
                  value={formData.recentEvents}
                  onChange={(e) => setFormData({
                    ...formData,
                    recentEvents: e.target.value
                  })}
                  rows={2}
                />
              </div>

              {/* Confirmation */}
              <div className="bg-accent/50 p-4 rounded-lg border border-accent">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="confirm-accuracy"
                    checked={formData.confirmed}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      confirmed: checked === true
                    })}
                  />
                  <label htmlFor="confirm-accuracy" className="text-sm">
                    I confirm this information is accurate
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !formData.confirmed}
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  "🔵 Start Wellness Check"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SymptomForm;