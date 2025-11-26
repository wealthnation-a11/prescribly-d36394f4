import { useState } from 'react';
import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHerbalPractitioner } from '@/hooks/useHerbalPractitioner';
import { User, Mail, Phone, MapPin, Award, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function HerbalProfile() {
  const { user } = useAuth();
  const { practitioner, isLoading } = useHerbalPractitioner();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: practitioner?.bio || '',
    phone: practitioner?.phone || '',
    practice_location: practitioner?.practice_location || '',
  });

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!practitioner?.id) throw new Error('No practitioner found');
      const { error } = await supabase
        .from('herbal_practitioners')
        .update({
          bio: data.bio,
          phone: data.phone,
          practice_location: data.practice_location,
        })
        .eq('id', practitioner.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Profile updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['herbal-practitioner'] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
    };
    const labels: Record<string, string> = {
      approved: 'Verified',
      pending: 'Pending Review',
      rejected: 'Not Approved',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  if (isLoading) {
    return (
      <HerbalPractitionerLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">Loading profile...</CardContent>
          </Card>
        </div>
      </HerbalPractitionerLayout>
    );
  }

  return (
    <HerbalPractitionerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your practitioner information</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">Edit Profile</Button>
          )}
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  Personal Information
                </CardTitle>
                {practitioner?.verification_status && getStatusBadge(practitioner.verification_status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Name</Label>
                <p className="font-medium text-sm sm:text-base truncate">{practitioner?.first_name} {practitioner?.last_name}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  Email
                </Label>
                <p className="font-medium text-sm sm:text-base break-all">{practitioner?.email}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  Phone
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="h-11 sm:h-10 text-sm"
                  />
                ) : (
                  <p className="font-medium text-sm sm:text-base">{practitioner?.phone || 'Not provided'}</p>
                )}
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  Practice Location
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.practice_location}
                    onChange={(e) => setFormData({ ...formData, practice_location: e.target.value })}
                    placeholder="Enter practice location"
                    className="h-11 sm:h-10 text-sm"
                  />
                ) : (
                  <p className="font-medium text-sm sm:text-base">{practitioner?.practice_location || 'Not provided'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Specialization</Label>
                <p className="font-medium text-sm sm:text-base">{practitioner?.specialization}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  Experience
                </Label>
                <p className="font-medium text-sm sm:text-base">
                  {practitioner?.years_of_experience ? `${practitioner.years_of_experience} years` : 'Not provided'}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">License Number</Label>
                <p className="font-medium text-sm sm:text-base break-all">{practitioner?.license_number || 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Professional Bio</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Share your background and expertise</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {isEditing ? (
              <div className="space-y-3 sm:space-y-4">
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Write about your experience, approach, and specialties..."
                  rows={6}
                  className="text-sm"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => updateProfile.mutate(formData)} disabled={updateProfile.isPending} className="w-full sm:w-auto h-11 sm:h-10">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto h-11 sm:h-10">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{practitioner?.bio || 'No bio provided yet'}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </HerbalPractitionerLayout>
  );
}
