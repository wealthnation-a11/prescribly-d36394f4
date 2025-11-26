import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Loader2 } from "lucide-react";

export const DoctorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Portal</h1>
          <p className="text-slate-600 mt-2">Access your professional dashboard</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your doctor account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/50"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
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
              
              {/* Herbal Practitioner Links */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-slate-600 mb-2">Are you a herbal practitioner?</p>
                <div className="flex flex-col gap-2">
                  <Link
                    to="/herbal-login"
                    className="text-emerald-600 hover:text-emerald-700 underline font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Login as Herbal Practitioner
                  </Link>
                  <Link
                    to="/herbal-register"
                    className="text-slate-600 hover:text-foreground underline transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Register as Herbal Practitioner
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorLogin;