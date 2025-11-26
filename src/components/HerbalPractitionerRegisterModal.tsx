import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface HerbalPractitionerRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HerbalPractitionerRegisterModal = ({
  isOpen,
  onClose,
}: HerbalPractitionerRegisterModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialization: "",
    yearsOfExperience: "",
    bio: "",
    licenseNumber: "",
    practiceLocation: "",
    qualifications: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to register as a herbal practitioner");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("herbal_practitioners").insert({
        user_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization,
        years_of_experience: parseInt(formData.yearsOfExperience) || null,
        bio: formData.bio,
        license_number: formData.licenseNumber || null,
        practice_location: formData.practiceLocation,
        qualifications: formData.qualifications ? JSON.parse(JSON.stringify([formData.qualifications])) : null,
        verification_status: "pending",
      });

      if (error) throw error;

      toast.success("Application submitted successfully! We'll review it shortly.");
      onClose();
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        specialization: "",
        yearsOfExperience: "",
        bio: "",
        licenseNumber: "",
        practiceLocation: "",
        qualifications: "",
      });
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            Register as Herbal Practitioner
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="specialization">Specialization *</Label>
            <Input
              id="specialization"
              placeholder="e.g., Traditional Chinese Medicine, Ayurveda, African Herbalism"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="yearsOfExperience">Years of Experience</Label>
            <Input
              id="yearsOfExperience"
              type="number"
              min="0"
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="licenseNumber">License Number (if applicable)</Label>
            <Input
              id="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="practiceLocation">Practice Location *</Label>
            <Input
              id="practiceLocation"
              placeholder="City, State, Country"
              value={formData.practiceLocation}
              onChange={(e) => setFormData({ ...formData, practiceLocation: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="qualifications">Qualifications</Label>
            <Textarea
              id="qualifications"
              placeholder="List your certifications, degrees, and training"
              value={formData.qualifications}
              onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="bio">Professional Bio *</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about your experience and practice"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              required
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
