import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MedicalIntakeFormProps {
  doctorName: string;
  doctorUserId: string;
  userAddress: string;
  userLat: number | null;
  userLng: number | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const MedicalIntakeForm = ({
  doctorName,
  doctorUserId,
  userAddress,
  userLat,
  userLng,
  onBack,
  onSuccess,
}: MedicalIntakeFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    symptoms: '',
    illness_duration: '',
    age: '',
    gender: '',
    urgency_level: '',
    address: userAddress,
    image: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.symptoms || !form.illness_duration || !form.age || !form.gender || !form.urgency_level || !form.address) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (form.image) {
        const ext = form.image.name.split('.').pop();
        const path = `home-visit/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('chat-files').upload(path, form.image);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from('home_visit_requests').insert({
        patient_id: user.id,
        doctor_id: doctorUserId,
        symptoms: form.symptoms.trim(),
        illness_duration: form.illness_duration.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        urgency_level: form.urgency_level,
        address: form.address.trim(),
        latitude: userLat,
        longitude: userLng,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({ title: 'Request Submitted', description: `Your home visit request has been sent to Dr. ${doctorName}. You'll be notified once they respond.` });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit request.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">Medical Intake Form — Dr. {doctorName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="symptoms">Symptoms *</Label>
            <Textarea id="symptoms" placeholder="Describe your symptoms..." value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} required maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration of Illness *</Label>
              <Input id="duration" placeholder="e.g. 3 days" value={form.illness_duration} onChange={(e) => setForm({ ...form, illness_duration: e.target.value })} required maxLength={100} />
            </div>
            <div>
              <Label htmlFor="age">Age *</Label>
              <Input id="age" type="number" min={0} max={150} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Gender *</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgency Level *</Label>
              <Select value={form.urgency_level} onValueChange={(v) => setForm({ ...form, urgency_level: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address *</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required maxLength={500} />
          </div>
          <div>
            <Label htmlFor="image">Upload Image (optional)</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground border border-dashed border-border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                <Upload className="h-4 w-4" />
                {form.image ? form.image.name : 'Click to upload an image'}
                <input id="image" type="file" accept="image/*" className="hidden" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />
              </label>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Home Visit Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
