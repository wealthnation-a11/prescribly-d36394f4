import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Building2, LogIn, Loader2, MapPin, CheckCircle } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const hospitalSchema = z.object({
  name: z.string().min(2, "Name is required").max(200),
  type: z.enum(["hospital", "clinic", "pharmacy"]),
  address: z.string().min(3, "Address is required").max(500),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(2, "Country is required").max(100),
  phone: z.string().min(5, "Phone is required").max(30),
  email: z.string().email("Valid email required").max(255),
  contact_person: z.string().min(2, "Contact person is required").max(200),
  description: z.string().max(1000).optional(),
});

const HospitalPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("register");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "", type: "hospital", address: "", city: "", state: "", country: "",
    phone: "", email: "", contact_person: "", description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  usePageSEO({
    title: "Hospital Portal - Prescribly",
    description: "Register your hospital or log in to the facility staff dashboard",
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleRegister = async () => {
    const validation = hospitalSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((i) => { fieldErrors[i.path[0] as string] = i.message; });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("hospital_registrations").insert({
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
        status: "pending" as any,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Application Submitted!", description: "Your hospital registration is under review. You'll receive login credentials once approved." });
      setTimeout(() => setActiveTab("login"), 2000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (authError) throw authError;

      const { data: staffRecord, error: staffError } = await supabase
        .from("facility_staff")
        .select("id, facility_id, is_active")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (staffError) throw staffError;

      if (!staffRecord) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "Your account is not linked to any facility. Contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Welcome!", description: "Logged in successfully." });
      navigate("/facility-dashboard");
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-lg border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Hospital Portal</CardTitle>
          <CardDescription>Register your facility or sign in to your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="mt-4">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold">Application Submitted!</h3>
                  <p className="text-muted-foreground text-sm">
                    Your hospital registration is under review. An admin will approve your application and send you login credentials.
                  </p>
                  <Button onClick={() => setActiveTab("login")}>Go to Login</Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Hospital/Facility Name *</Label>
                      <Input value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. City General Hospital" />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type *</Label>
                      <Select value={formData.type} onValueChange={(v) => handleChange("type", v)}>
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
                      <Input value={formData.contact_person} onChange={(e) => handleChange("contact_person", e.target.value)} placeholder="Full name" />
                      {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person}</p>}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Address *</Label>
                      <Input value={formData.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="Street address" />
                      {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>City *</Label>
                      <Input value={formData.city} onChange={(e) => handleChange("city", e.target.value)} />
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>State</Label>
                      <Input value={formData.state} onChange={(e) => handleChange("state", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country *</Label>
                      <Input value={formData.country} onChange={(e) => handleChange("country", e.target.value)} />
                      {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone *</Label>
                      <Input value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} type="tel" />
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Email *</Label>
                      <Input value={formData.email} onChange={(e) => handleChange("email", e.target.value)} type="email" />
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
                      <Textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Brief description of your facility..." rows={3} />
                    </div>
                  </div>
                  <Button onClick={handleRegister} disabled={submitting} className="w-full">
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit Registration"}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="staff@hospital.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  <LogIn className="h-4 w-4 mr-2" />
                  {loginLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HospitalPortal;
