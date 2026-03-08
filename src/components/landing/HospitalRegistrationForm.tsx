import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, MapPin, Building2, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const hospitalSchema = z.object({
  name: z.string().min(2, 'Name is required').max(200),
  type: z.enum(['hospital', 'clinic', 'pharmacy']),
  address: z.string().min(3, 'Address is required').max(500),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(2, 'Country is required').max(100),
  phone: z.string().min(5, 'Phone is required').max(30),
  email: z.string().email('Valid email required').max(255),
  contact_person: z.string().min(2, 'Contact person is required').max(200),
  description: z.string().max(1000).optional(),
});

interface HospitalRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HospitalRegistrationForm: React.FC<HospitalRegistrationFormProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', type: 'hospital', address: '', city: '', state: '', country: '', phone: '', email: '', contact_person: '', description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, [open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const validation = hospitalSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach(i => { fieldErrors[i.path[0] as string] = i.message; });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('hospital_registrations').insert({
        name: formData.name,
        type: formData.type,
        address: formData.address,
        city: formData.city,
        state: formData.state || null,
        country: formData.country,
        phone: formData.phone,
        email: formData.email,
        contact_person: formData.contact_person,
        description: formData.description || null,
        latitude: lat,
        longitude: lng,
        submitted_by: user?.id || null,
        status: 'pending' as any,
      });

      if (error) throw error;
      setSubmitted(true);
      toast.success('Your hospital registration has been submitted for review!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold">Application Submitted!</h3>
            <p className="text-muted-foreground text-sm">
              Your hospital registration has been submitted for review. An admin will review and approve your application shortly.
            </p>
            <Button onClick={() => { onOpenChange(false); setSubmitted(false); }}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Register Your Hospital
          </DialogTitle>
          <DialogDescription>
            Fill in your facility details. Once approved, your hospital will appear on our platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Hospital/Facility Name *</Label>
              <Input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. City General Hospital" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Contact Person *</Label>
              <Input value={formData.contact_person} onChange={(e) => handleChange('contact_person', e.target.value)} placeholder="Full name" />
              {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address *</Label>
              <Input value={formData.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Street address" />
              {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input value={formData.city} onChange={(e) => handleChange('city', e.target.value)} />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={formData.state} onChange={(e) => handleChange('state', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Input value={formData.country} onChange={(e) => handleChange('country', e.target.value)} />
              {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} type="tel" />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Email *</Label>
              <Input value={formData.email} onChange={(e) => handleChange('email', e.target.value)} type="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {lat && lng && (
              <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                <MapPin className="h-4 w-4 text-primary" />
                Location auto-detected ({lat.toFixed(4)}, {lng.toFixed(4)})
              </div>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Brief description of your facility..." rows={3} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit Registration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
