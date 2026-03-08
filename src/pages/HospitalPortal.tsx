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
import { Building2, LogIn, Loader2, MapPin, CheckCircle, Eye, EyeOff } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";
import { PasswordValidator } from "@/components/PasswordValidator";
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
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const HospitalPortal = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("register");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [formData, setFormData] = useState({
    name: "", type: "hospital", address: "", city: "", state: "", country: "",
    phone: "", email: "", contact_person: "", description: "",
    password: "", confirmPassword: "",
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

    if (!isPasswordValid) {
      toast({ title: "Invalid Password", description: "Please meet all password requirements.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Create auth account with the provided email and password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.contact_person.split(" ")[0],
            last_name: formData.contact_person.split(" ").slice(1).join(" ") || "",
            role: "patient",
          },
        },
      });

      if (authError) throw authError;

      // Submit hospital registration
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
        submitted_by: authData.user?.id || null,
        status: "pending" as any,
      });
      if (error) throw error;

      // Sign out after registration since they need admin approval
      await supabase.auth.signOut();

      setSubmitted(true);
      toast({ title: "Application Submitted!", description: "Your hospital registration is under review. Use your email and password to log in once approved." });
      setTimeout(() => navigate("/hospital"), 2000);
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
          description: "Your account is not linked to any facility yet. Your registration may still be under review.",
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
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Application Submitted!</h3>
                  <p className="text-muted-foreground text-sm">
                    Your hospital registration is under review. Once approved, use your email and password to log in.
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

                    {/* Password Fields */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleChange("password", e.target.value)}
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => handleChange("confirmPassword", e.target.value)}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                    </div>

                    {/* Password Validator */}
                    <div className="sm:col-span-2">
                      <PasswordValidator
                        password={formData.password}
                        confirmPassword={formData.confirmPassword}
                        onValidationChange={setIsPasswordValid}
                      />
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
                  <Button onClick={handleRegister} disabled={submitting || !isPasswordValid} className="w-full">
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
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
