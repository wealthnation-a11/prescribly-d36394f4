import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Check, Upload, Users, BarChart3, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EnterpriseDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnterpriseDemoModal = ({ open, onOpenChange }: EnterpriseDemoModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    organizationType: "",
    fullName: "",
    workEmail: "",
    organizationName: "",
    additionalFeatures: [] as string[],
    briefOrProposal: "",
  });

  const organizationTypes = [
    "Hospital",
    "Clinic",
    "Healthcare System",
    "Pharmaceutical Company",
    "Insurance Company",
    "Government Health Agency",
    "Other Healthcare Organization"
  ];

  const additionalFeatures = [
    "Custom API Integration",
    "Data Security & Compliance Briefing",
    "Bulk Onboarding for Staff",
    "Analytics Dashboard Demo",
    "Dedicated Account Manager",
    "Integration with Hospital Systems (EMR)"
  ];

  const handleFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        additionalFeatures: [...prev.additionalFeatures, feature]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        additionalFeatures: prev.additionalFeatures.filter(f => f !== feature)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.organizationType || !formData.fullName || !formData.workEmail || !formData.organizationName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // For now, just show success message since user said no API key needed
    toast({
      title: "Demo Request Submitted!",
      description: "Our team will contact you within 24-48 hours to onboard you professionally.",
    });
    
    // Reset form and close modal
    setFormData({
      organizationType: "",
      fullName: "",
      workEmail: "",
      organizationName: "",
      additionalFeatures: [],
      briefOrProposal: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Get Started with the Enterprise Plan
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Select your organization type and fill in your details below. Our team will get in touch 
            within 24-48 hours to onboard you professionally.
          </p>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-8 mt-6">
          {/* Left Side - What's Included */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-4">What's Included</h3>
              
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-muted-foreground">Includes in the Individual Plan</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">Symptom-based AI diagnosis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">Drug recommendations and dosages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">24/7 access to Prescribly's medical AI Hs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">Easy-to-use patient dashboard</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-primary">Enterprise-Only Features</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm">Multi-user Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm">Advanced Analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm">Priority Support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm">API Integration</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-primary">Bonus Perks</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">Custom Onboarding for your team</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">Dedicated Account Manager</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">Data Privacy & Compliance Support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm">Early access to new AI features</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="organizationType">Select Your Organization</Label>
                <Select value={formData.organizationType} onValueChange={(value) => setFormData(prev => ({ ...prev, organizationType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="workEmail">Work Email Address</Label>
                <Input
                  id="workEmail"
                  type="email"
                  placeholder="work@company.com"
                  value={formData.workEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, workEmail: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  placeholder="Organization name"
                  value={formData.organizationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Additional Features You're Interested in</Label>
                <div className="space-y-2 mt-2">
                  {additionalFeatures.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature}
                        checked={formData.additionalFeatures.includes(feature)}
                        onCheckedChange={(checked) => handleFeatureChange(feature, checked as boolean)}
                      />
                      <Label htmlFor={feature} className="text-sm font-normal">
                        {feature}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="briefOrProposal">Upload brief or proposal (optional)</Label>
                <div className="mt-1">
                  <Textarea
                    id="briefOrProposal"
                    placeholder="You can describe your requirements or paste a link to your proposal document..."
                    value={formData.briefOrProposal}
                    onChange={(e) => setFormData(prev => ({ ...prev, briefOrProposal: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Submit Inquiry
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};