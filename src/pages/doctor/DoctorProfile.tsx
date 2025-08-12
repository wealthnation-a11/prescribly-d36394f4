import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { DoctorLayout } from "@/components/DoctorLayout";
import { 
  User, 
  Award, 
  Star, 
  Clock, 
  DollarSign, 
  Calendar,
  MapPin,
  Stethoscope,
  FileText,
  Camera,
  Save
} from "lucide-react";

interface DoctorProfileData {
  id?: string;
  user_id: string;
  specialization: string;
  license_number?: string;
  bio?: string;
  consultation_fee?: number;
  years_of_experience?: number;
  verification_status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating?: number;
  total_reviews?: number;
}

interface AvailabilityData {
  id?: string;
  doctor_id: string;
  weekday: string;
  start_time?: string;
  end_time?: string;
  timezone: string;
  is_available: boolean;
}

interface EarningsData {
  total_earnings: number;
  total_calls: number;
  avg_call_duration: number;
}

const weekdays = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

export const DoctorProfile = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  
  // Profile data
  const [profileData, setProfileData] = useState<DoctorProfileData>({
    user_id: user?.id || '',
    specialization: '',
    license_number: '',
    bio: '',
    consultation_fee: 0,
    years_of_experience: 0,
    verification_status: 'pending',
    rating: 0,
    total_reviews: 0
  });

  // Availability data
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData[]>([]);
  
  // Earnings data
  const [earningsData, setEarningsData] = useState<EarningsData>({
    total_earnings: 0,
    total_calls: 0,
    avg_call_duration: 0
  });

  useEffect(() => {
    if (user?.id) {
      fetchDoctorProfile();
      fetchAvailability();
      fetchEarnings();
    }
  }, [user?.id]);

  const fetchDoctorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', user?.id);

      if (error) {
        console.error('Error fetching availability:', error);
        return;
      }

      if (data && data.length > 0) {
        setAvailabilityData(data);
      } else {
        // Initialize with default availability data
        const defaultAvailability = weekdays.map(day => ({
          doctor_id: user?.id || '',
          weekday: day.value,
          start_time: '09:00',
          end_time: '17:00',
          timezone: 'Africa/Lagos',
          is_available: false
        }));
        setAvailabilityData(defaultAvailability);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('doctor_earnings, duration_minutes')
        .eq('doctor_id', user?.id);

      if (error) {
        console.error('Error fetching earnings:', error);
        return;
      }

      if (data) {
        const totalEarnings = data.reduce((sum, call) => sum + (Number(call.doctor_earnings) || 0), 0);
        const totalCalls = data.length;
        const avgDuration = data.length > 0 
          ? data.reduce((sum, call) => sum + (call.duration_minutes || 0), 0) / data.length
          : 0;

        setEarningsData({
          total_earnings: totalEarnings,
          total_calls: totalCalls,
          avg_call_duration: Math.round(avgDuration)
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('doctors')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Delete existing availability
      await supabase
        .from('doctor_availability')
        .delete()
        .eq('doctor_id', user.id);

      // Insert new availability
      const { error } = await supabase
        .from('doctor_availability')
        .insert(availabilityData.filter(slot => slot.is_available));

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = (weekday: string, field: string, value: any) => {
    setAvailabilityData(prev => 
      prev.map(slot => 
        slot.weekday === weekday 
          ? { ...slot, [field]: value }
          : slot
      )
    );
  };

  return (
    <DoctorLayout title="My Profile" subtitle="Manage your professional information and settings">
      <div className="space-y-6">

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <User className="w-5 h-5 text-primary" />
              Profile Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-card-foreground">
              {profileData.specialization ? '95%' : '60%'}
            </p>
            <p className="text-sm text-muted-foreground">completion rate</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <Award className="w-5 h-5 text-secondary" />
              Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-card-foreground">
              {profileData.years_of_experience || 0}
            </p>
            <p className="text-sm text-muted-foreground">years practicing</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <DollarSign className="w-5 h-5 text-accent" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-card-foreground">
              ₦{earningsData.total_earnings.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">from {earningsData.total_calls} calls</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
              <Star className="w-5 h-5 text-primary" />
              Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-card-foreground">4.8</p>
            <p className="text-sm text-muted-foreground">patient rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border">
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Professional Profile
                </TabsTrigger>
                <TabsTrigger value="availability" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Availability Settings
                </TabsTrigger>
                <TabsTrigger value="earnings" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Earnings Overview
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Professional Profile Tab */}
            <TabsContent value="profile" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Professional Information
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={userProfile?.first_name || ''}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={userProfile?.last_name || ''}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="specialization">Medical Specialization</Label>
                      <Input
                        id="specialization"
                        value={profileData.specialization || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, specialization: e.target.value }))}
                        placeholder="e.g., Cardiology, Pediatrics, General Medicine"
                      />
                    </div>

                    <div>
                      <Label htmlFor="license_number">Medical License Number</Label>
                      <Input
                        id="license_number"
                        value={profileData.license_number || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, license_number: e.target.value }))}
                        placeholder="Your medical registration number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="consultation_fee">Consultation Fee (₦)</Label>
                      <Input
                        id="consultation_fee"
                        type="number"
                        value={profileData.consultation_fee || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, consultation_fee: parseInt(e.target.value) || 0 }))}
                        placeholder="Consultation fee in Naira"
                      />
                    </div>

                    <div>
                      <Label htmlFor="years_of_experience">Years of Experience</Label>
                      <Input
                        id="years_of_experience"
                        type="number"
                        value={profileData.years_of_experience || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, years_of_experience: parseInt(e.target.value) || 0 }))}
                        placeholder="Years practicing medicine"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio/Short Introduction</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio || ''}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Brief introduction about yourself and your practice"
                        rows={4}
                      />
                    </div>

                    <Button onClick={saveProfile} disabled={loading} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </div>

                {/* Profile Preview */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Preview
                  </h3>

                  <Card className="border-border">
                    <CardContent className="p-6 text-center space-y-4">
                      <Avatar className="w-24 h-24 mx-auto">
                        <AvatarImage src={userProfile?.avatar_url} />
                        <AvatarFallback className="text-xl">
                          {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      <Button variant="outline" size="sm">
                        <Camera className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>

                      <div className="text-left space-y-2">
                        <h4 className="font-semibold text-lg text-card-foreground">
                          Dr. {userProfile?.first_name} {userProfile?.last_name}
                        </h4>
                        <p className="text-muted-foreground">{profileData.specialization || 'Specialization not set'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          ₦{profileData.consultation_fee || 0} consultation fee
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          {profileData.years_of_experience || 0} years experience
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Availability Settings Tab */}
            <TabsContent value="availability" className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Set Your Working Hours
                </h3>

                <div className="space-y-4">
                  {weekdays.map((day) => {
                    const dayData = availabilityData.find(slot => slot.weekday === day.value) || {
                      doctor_id: user?.id || '',
                      weekday: day.value,
                      start_time: '09:00',
                      end_time: '17:00',
                      timezone: 'Africa/Lagos',
                      is_available: false
                    };

                    return (
                      <Card key={day.value} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <Checkbox
                              checked={dayData.is_available}
                              onCheckedChange={(checked) => 
                                updateAvailability(day.value, 'is_available', checked)
                              }
                            />
                            <div className="w-20 font-medium text-card-foreground">
                              {day.label}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="time"
                                value={dayData.start_time || '09:00'}
                                onChange={(e) => updateAvailability(day.value, 'start_time', e.target.value)}
                                disabled={!dayData.is_available}
                                className="w-32"
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={dayData.end_time || '17:00'}
                                onChange={(e) => updateAvailability(day.value, 'end_time', e.target.value)}
                                disabled={!dayData.is_available}
                                className="w-32"
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {dayData.timezone}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Button onClick={saveAvailability} disabled={loading} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Availability'}
                </Button>
              </div>
            </TabsContent>

            {/* Earnings Overview Tab */}
            <TabsContent value="earnings" className="p-6 space-y-6">
              {earningsData.total_calls > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Earnings Summary
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-border bg-card">
                      <CardContent className="p-4 text-center">
                        <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-card-foreground">
                          ₦{earningsData.total_earnings.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                      <CardContent className="p-4 text-center">
                        <Clock className="w-8 h-8 text-secondary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-card-foreground">
                          {earningsData.total_calls}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Calls</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                      <CardContent className="p-4 text-center">
                        <Calendar className="w-8 h-8 text-accent mx-auto mb-2" />
                        <p className="text-2xl font-bold text-card-foreground">
                          {earningsData.avg_call_duration}
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Duration (min)</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border bg-card">
                      <CardContent className="p-4 text-center">
                        <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold text-card-foreground">Weekly</p>
                        <p className="text-sm text-muted-foreground">Payment Frequency</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-card-foreground">Payment Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate per call:</span>
                        <span className="font-semibold text-card-foreground">₦8.00 (₦10 patient fee)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform fee:</span>
                        <span className="font-semibold text-card-foreground">₦2.00 per call</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next payout:</span>
                        <span className="font-semibold text-card-foreground">Every Friday</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">No earnings yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    You haven't earned yet. Once patients schedule paid calls, your earnings will show here.
                    Each successful call earns you ₦8 (₦10 patient fee minus ₦2 platform fee).
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </DoctorLayout>
  );
};

export default DoctorProfile;