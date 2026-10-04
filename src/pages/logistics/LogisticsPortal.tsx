import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Truck, Loader2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";

const schema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  address: z.string().trim().min(5, "Address is required").max(300),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  registration_number: z.string().trim().min(3, "Registration / CAC number is required").max(80),
  contact_person: z.string().trim().min(2, "Contact person is required").max(120),
  coverage_areas: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const empty = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  registration_number: "",
  contact_person: "",
  coverage_areas: "",
  description: "",
  password: "",
};

export default function LogisticsPortal() {
  usePageSEO({
    title: "Logistics Portal | Prescribly",
    description:
      "Register your logistics company on Prescribly and deliver medication orders from partner pharmacies.",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const set = (k: keyof typeof empty, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const handleRegister = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.contact_person.split(" ")[0],
            last_name: form.contact_person.split(" ").slice(1).join(" ") || "",
            role: "logistics",
          },
        },
      });
      if (authError) throw authError;

      const ownerId = authData.user?.id;
      if (!ownerId) throw new Error("Could not create your logistics account");

      const { error } = await supabase.from("logistics_companies").insert({
        owner_user_id: ownerId,
        name: form.name,
        contact_person: form.contact_person,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state || null,
        registration_number: form.registration_number,
        coverage_areas: form.coverage_areas || null,
        description: form.description || null,
        status: "pending",
        is_active: false,
      } as any);
      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Application submitted",
        description: "Our team will review your company. You can sign in once it's approved.",
      });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      const { data: company } = await supabase
        .from("logistics_companies")
        .select("id")
        .eq("owner_user_id", authData.user.id)
        .maybeSingle();

      if (!company) {
        await supabase.auth.signOut();
        toast({
          title: "No logistics company found",
          description: "This account isn't linked to a logistics company. Register first.",
          variant: "destructive",
        });
        return;
      }

      navigate("/logistics-dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoggingIn(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/30">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-3">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-bold">Application received</h1>
            <p className="text-sm text-muted-foreground">
              Our team is reviewing {form.name}. Once approved you'll be able to sign in and accept
              delivery jobs from partner pharmacies.
            </p>
            <Button className="w-full" onClick={() => setSubmitted(false)}>
              Back to portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const field = (k: keyof typeof empty, label: string, placeholder: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        type={type}
        value={form[k]}
        placeholder={placeholder}
        onChange={(e) => set(k, e.target.value)}
      />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/30">
      <Card className="w-full max-w-lg border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex items-center gap-2">
            <Logo size="lg" withLink priority />
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Prescribly Logistics Portal</CardTitle>
          <CardDescription>
            Register your delivery company, get approved and start fulfilling medication deliveries
            for partner pharmacies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="register">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="login">Sign in</TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="pt-4 space-y-3">
              {field("name", "Company name", "Swift Riders Logistics")}
              {field("contact_person", "Contact person", "Full name")}
              {field("email", "Email", "company@email.com", "email")}
              {field("phone", "Phone", "080...")}
              {field("registration_number", "Registration / CAC number", "RC123456")}
              {field("address", "Address", "Street address")}
              <div className="grid grid-cols-2 gap-3">
                {field("city", "City", "Lagos")}
                {field("state", "State", "Lagos")}
              </div>
              {field("coverage_areas", "Areas you cover", "Ikeja, Yaba, Surulere")}
              <div className="space-y-1.5">
                <Label htmlFor="description">About your company</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  placeholder="Fleet size, delivery times, anything pharmacies should know"
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              {field("password", "Password", "At least 8 characters", "password")}
              <Button className="w-full" onClick={handleRegister} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit application
              </Button>
            </TabsContent>

            <TabsContent value="login" className="pt-4">
              <form className="space-y-3" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loggingIn}>
                  {loggingIn && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
