import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Mail } from "lucide-react";

interface CustomTeamContactFormProps {
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
}

export const CustomTeamContactForm = ({ 
  trigger, 
  title = "Custom Team Solutions", 
  description = "Tell us about your organization's specific needs and we'll create a tailored solution for you." 
}: CustomTeamContactFormProps) => {
  const [formData, setFormData] = useState({
    organizationName: "",
    contactName: "",
    email: "",
    organizationType: "",
    teamSize: "",
    specificNeeds: ""
  });

  const handleSubmit = () => {
    const { organizationName, contactName, email, organizationType, teamSize, specificNeeds } = formData;
    
    const emailSubject = encodeURIComponent(`Custom Team Solution Request - ${organizationName}`);
    const emailBody = encodeURIComponent(
      `Organization Name: ${organizationName}\nContact Name: ${contactName}\nEmail: ${email}\nOrganization Type: ${organizationType}\nTeam Size: ${teamSize}\n\nSpecific Needs & Requirements:\n${specificNeeds}`
    );
    
    const mailtoLink = `mailto:prescribly@gmail.com?subject=${emailSubject}&body=${emailBody}`;
    window.location.href = mailtoLink;
  };

  const defaultTrigger = (
    <Button variant="cta" className="w-full">
      <Building2 className="w-4 h-4 mr-2" />
      Request Custom Solution
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="Your organization name"
                value={formData.organizationName}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                placeholder="Your full name"
                value={formData.contactName}
                onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@organization.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizationType">Organization Type</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, organizationType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="healthcare-network">Healthcare Network</SelectItem>
                  <SelectItem value="telemedicine">Telemedicine Provider</SelectItem>
                  <SelectItem value="corporate">Corporate Healthcare</SelectItem>
                  <SelectItem value="government">Government/Public Health</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, teamSize: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10-50">10-50 members</SelectItem>
                  <SelectItem value="51-100">51-100 members</SelectItem>
                  <SelectItem value="101-500">101-500 members</SelectItem>
                  <SelectItem value="500+">500+ members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specificNeeds">Specific Needs & Requirements</Label>
            <Textarea
              id="specificNeeds"
              placeholder="Please describe your organization's specific healthcare technology needs, integration requirements, compliance needs, or any custom features you require..."
              className="min-h-[120px]"
              value={formData.specificNeeds}
              onChange={(e) => setFormData(prev => ({ ...prev, specificNeeds: e.target.value }))}
            />
          </div>
          
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={!formData.organizationName || !formData.contactName || !formData.email || !formData.specificNeeds}
          >
            Send Custom Solution Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};