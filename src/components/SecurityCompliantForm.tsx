import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Lock, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const SecurityCompliantForm = () => {
  const [symptoms, setSymptoms] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [medicalHistory, setMedicalHistory] = useState<string>("");
  const [emergencyResponse, setEmergencyResponse] = useState<any>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);

  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("System Assessment functionality has been removed");
  };

  const handleEmergencyAcknowledge = () => {
    setEmergencyResponse(null);
    toast.success("Please seek immediate medical attention");
  };

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-semibold mb-4">Secure Medical Diagnosis</h2>
          <p className="text-muted-foreground mb-6">
            Please log in to access the secure diagnostic system. Your privacy and data security are our top priorities.
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            <UserCheck className="h-4 w-4 mr-2" />
            Log In to Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (emergencyResponse) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">System Assessment Removed</h2>
          <p className="text-muted-foreground">
            The system assessment functionality has been removed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (diagnosisResult) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Diagnosis Completed Securely
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium">
              Your diagnosis has been processed securely with AI validation and is now pending doctor review.
            </p>
            <p className="text-sm text-green-700 mt-2">
              Session ID: {diagnosisResult.sessionId}
            </p>
            {diagnosisResult.performance && (
              <div className="text-xs text-green-600 mt-1">
                Processing time: {diagnosisResult.performance.totalLatency}ms
              </div>
            )}
          </div>

          
          {diagnosisResult.diagnosis?.conditions && (
            <div className="space-y-2">
              <h3 className="font-semibold">Preliminary Analysis:</h3>
              {diagnosisResult.diagnosis.conditions.map((condition: any, index: number) => (
                <div key={index} className="p-3 bg-slate-50 rounded border">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{condition.name}</h4>
                    <span className="text-sm bg-blue-100 px-2 py-1 rounded">
                      {Math.round(condition.probability * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {condition.description}
                  </p>
                  <div className="mt-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      condition.urgency === 'high' ? 'bg-red-100 text-red-800' :
                      condition.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {condition.urgency} urgency
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={() => setDiagnosisResult(null)}
              variant="outline"
              className="flex-1"
            >
              Submit Another Diagnosis
            </Button>
            <Button 
              onClick={() => window.location.href = '/book-appointment'}
              className="flex-1"
            >
              Book Doctor Consultation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Secure Medical Diagnosis System
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          All data is encrypted and compliant with healthcare privacy standards
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symptoms">Describe Your Symptoms *</Label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="List your symptoms separated by commas (e.g., headache, fever, nausea)"
              className="min-h-[100px]"
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum 2000 characters. Separate multiple symptoms with commas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity (1-10)</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num <= 3 ? '(Mild)' : num <= 6 ? '(Moderate)' : '(Severe)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="How long?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="1-3 days">1-3 days</SelectItem>
                  <SelectItem value="1 week">1 week</SelectItem>
                  <SelectItem value="2+ weeks">2+ weeks</SelectItem>
                  <SelectItem value="1+ month">1+ month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age (Optional)</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Your age"
                min="1"
                max="120"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender (Optional)</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalHistory">Relevant Medical History (Optional)</Label>
            <Textarea
              id="medicalHistory"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="Any relevant medical conditions, medications, or allergies"
              maxLength={1000}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Security & Privacy Notice</p>
                <ul className="text-blue-700 mt-1 space-y-1">
                  <li>• All data is encrypted in transit and at rest</li>
                  <li>• No personal identifiers are stored in AI logs</li>
                  <li>• Rate limiting prevents system abuse</li>
                  <li>• Emergency symptoms are automatically flagged</li>
                </ul>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">
            System Assessment Removed - Feature Unavailable
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};