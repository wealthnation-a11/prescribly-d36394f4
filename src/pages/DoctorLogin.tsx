import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Loader2, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";

export const DoctorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signOut, user } = useAuth();
  const { isDoctor, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is already logged in and is a doctor
  useEffect(() => {
    if (user && !roleLoading) {
      if (isDoctor) {
        navigate("/doctor-dashboard");
      } else {
        // User is logged in but not a doctor - sign them out
        signOut();
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Doctor accounts only. Please use the patient login.",
        });
      }
    }
  }, [user, isDoctor, roleLoading, navigate, signOut, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Invalid email or password. Please check your credentials.",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            variant: "destructive",
            title: "Email Not Verified",
            description: "Please check your email and click the verification link before logging in.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message || "An unexpected error occurred.",
          });
        }
      } else {
        // Authentication successful - role check will happen in useEffect
        toast({
          title: "Login Successful",
          description: "Verifying doctor credentials...",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-950 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-2xl bg-white px-4 py-2 shadow-lg"><Logo size="lg" priority /></div>
          </div>
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-teal-400 to-sky-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/40 ring-4 ring-teal-400/20">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Doctor Portal</h1>
          <p className="text-teal-100/80">Sign in to access your professional dashboard</p>
        </div>

        <Card className="bg-white border-t-4 border-t-teal-500 border-slate-200 shadow-2xl shadow-black/40 rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-slate-900">Welcome Back, Doctor</CardTitle>
            <CardDescription>
              Sign in to your doctor account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-800 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-800 font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-slate-600">
                Don't have a doctor account?{" "}
                <Link to="/doctor-register" className="text-primary hover:underline font-medium">
                  Register here
                </Link>
              </p>
              <p className="text-slate-600 mt-2">
                Are you a patient?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Patient Login
                </Link>
              </p>
              
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorLogin;