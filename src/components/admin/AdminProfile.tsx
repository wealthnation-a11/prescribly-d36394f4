import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Mail, Phone, Shield, Calendar, Save, Loader2, Camera } from "lucide-react";
import { format } from "date-fns";

export function AdminProfile() {
  const { user, userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: userProfile?.first_name || "",
    last_name: userProfile?.last_name || "",
    phone: userProfile?.phone || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name || userProfile?.first_name || "";
    const last = formData.last_name || userProfile?.last_name || "";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "AD";
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-24 lg:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-violet-500/20" />
        <CardContent className="relative pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16">
            <div className="relative">
              <Avatar className="h-24 w-24 lg:h-32 lg:w-32 border-4 border-background shadow-lg">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="text-2xl lg:text-3xl font-bold bg-gradient-to-br from-primary to-violet-500 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 text-center sm:text-left pb-2">
              <h2 className="text-xl lg:text-2xl font-bold">
                {formData.first_name || userProfile?.first_name || "Admin"}{" "}
                {formData.last_name || userProfile?.last_name || "User"}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                <Badge variant="default" className="bg-primary/90">
                  <Shield className="h-3 w-3 mr-1" />
                  Administrator
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => {
                if (isEditing) {
                  setFormData({
                    first_name: userProfile?.first_name || "",
                    last_name: userProfile?.last_name || "",
                    phone: userProfile?.phone || "",
                  });
                }
                setIsEditing(!isEditing);
              }}
              className="shrink-0"
            >
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/30 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Manage your personal details</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                {isEditing ? (
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted/50 rounded-md">
                    {userProfile?.first_name || "Not set"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                  />
                ) : (
                  <p className="text-sm p-2 bg-muted/50 rounded-md">
                    {userProfile?.last_name || "Not set"}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-sm p-2 bg-muted/50 rounded-md">
                  {userProfile?.phone || "Not set"}
                </p>
              )}
            </div>

            {isEditing && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto mt-4"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/30 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-violet-500" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details and status</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <p className="text-sm p-2 bg-muted/50 rounded-md flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {user?.email}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Role</Label>
              <p className="text-sm p-2 bg-muted/50 rounded-md flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Administrator
              </p>
            </div>

            <div className="space-y-2">
              <Label>Account Created</Label>
              <p className="text-sm p-2 bg-muted/50 rounded-md flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {userProfile?.created_at
                  ? format(new Date(userProfile.created_at), "MMMM d, yyyy")
                  : "Unknown"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Last Login</Label>
              <p className="text-sm p-2 bg-muted/50 rounded-md flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {userProfile?.last_login
                  ? format(new Date(userProfile.last_login), "MMMM d, yyyy 'at' h:mm a")
                  : "First login"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Section */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/30 bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-emerald-500" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-muted-foreground">
                Change your password to keep your account secure
              </p>
            </div>
            <Button variant="outline" className="shrink-0">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
