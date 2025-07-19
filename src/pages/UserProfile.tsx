import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Edit, Save, X, Phone, Mail, Calendar, MapPin, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const UserProfile = () => {
  const { user, signOut, userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    location_country: "",
    location_state: "",
    medical_history: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        setProfile(data);
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          email: data.email || "",
          date_of_birth: data.date_of_birth || "",
          gender: data.gender || "",
          location_country: data.location_country || "",
          location_state: data.location_state || "",
          medical_history: data.medical_history || ""
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          location_country: formData.location_country,
          location_state: formData.location_state,
          medical_history: formData.medical_history,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      date_of_birth: profile?.date_of_birth || "",
      gender: profile?.gender || "",
      location_country: profile?.location_country || "",
      location_state: profile?.location_state || "",
      medical_history: profile?.medical_history || ""
    });
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1 flex items-center justify-between">
              <h1 className="text-heading text-foreground">My Profile</h1>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Profile Header */}
              <Card className="dashboard-card">
                <CardContent className="p-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/10">
                      <User className="w-12 h-12 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        {profile?.first_name} {profile?.last_name}
                      </h2>
                      <p className="text-content text-muted-foreground mb-4">
                        Patient ID: #{user?.id?.slice(0, 8)}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {profile?.email}
                        </div>
                        {profile?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {profile.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card className="dashboard-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-content font-medium text-foreground mb-2">
                          First Name
                        </label>
                        <Input
                          value={formData.first_name}
                          onChange={(e) => setFormData({
                            ...formData,
                            first_name: e.target.value
                          })}
                          disabled={!isEditing}
                          className="transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-content font-medium text-foreground mb-2">
                          Last Name
                        </label>
                        <Input
                          value={formData.last_name}
                          onChange={(e) => setFormData({
                            ...formData,
                            last_name: e.target.value
                          })}
                          disabled={!isEditing}
                          className="transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-content font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <Input
                        value={formData.email}
                        disabled={true}
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    <div>
                      <label className="block text-content font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({
                          ...formData,
                          phone: e.target.value
                        })}
                        disabled={!isEditing}
                        placeholder="Enter your phone number"
                        className="transition-all duration-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-content font-medium text-foreground mb-2">
                          Date of Birth
                        </label>
                        <Input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({
                            ...formData,
                            date_of_birth: e.target.value
                          })}
                          disabled={!isEditing}
                          className="transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-content font-medium text-foreground mb-2">
                          Gender
                        </label>
                        <Input
                          value={formData.gender}
                          onChange={(e) => setFormData({
                            ...formData,
                            gender: e.target.value
                          })}
                          disabled={!isEditing}
                          placeholder="Gender"
                          className="transition-all duration-200"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location & Health */}
                <Card className="dashboard-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Location & Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-content font-medium text-foreground mb-2">
                          Country
                        </label>
                        <Input
                          value={formData.location_country}
                          onChange={(e) => setFormData({
                            ...formData,
                            location_country: e.target.value
                          })}
                          disabled={!isEditing}
                          placeholder="Country"
                          className="transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-content font-medium text-foreground mb-2">
                          State/Province
                        </label>
                        <Input
                          value={formData.location_state}
                          onChange={(e) => setFormData({
                            ...formData,
                            location_state: e.target.value
                          })}
                          disabled={!isEditing}
                          placeholder="State or Province"
                          className="transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-content font-medium text-foreground mb-2">
                        Medical History
                      </label>
                      <Textarea
                        value={formData.medical_history}
                        onChange={(e) => setFormData({
                          ...formData,
                          medical_history: e.target.value
                        })}
                        disabled={!isEditing}
                        placeholder="Enter any relevant medical history, allergies, or current medications..."
                        className="min-h-[120px] transition-all duration-200"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              {isEditing ? (
                <Card className="dashboard-card">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1 gap-2"
                        disabled={isSaving}
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        className="flex-1 gap-2"
                        disabled={isSaving}
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="dashboard-card">
                  <CardContent className="p-6">
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="w-full text-destructive hover:bg-destructive/10 gap-2"
                    >
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default UserProfile;