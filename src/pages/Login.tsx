import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Login = () => {
  const { t } = useTranslation();
  const [userType, setUserType] = useState<"patient" | "doctor">("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block doctors from logging in through patient login
    if (userType === "doctor") {
      toast({
        title: "Access Denied",
        description: "Doctors must use the Doctor Login section.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('Login error:', error);
        let errorMessage = error.message;
        
        // Handle specific error cases
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account before logging in.";
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = "Too many login attempts. Please wait a moment and try again.";
        }
        
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        
        // Check if user needs subscription before redirecting
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_legacy')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();
        
        // If patient (not legacy) without subscription, redirect to subscription page
        if (profile?.role === 'patient' && !profile?.is_legacy) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('status', 'active')
            .maybeSingle();
          
          if (!subscription) {
            navigate("/subscription");
            return;
          }
        }
        
        // Redirect to dashboard which will handle role-based routing
        navigate("/dashboard");
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please check your connection and try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Logo size="lg" priority />
          </div>
          
          {/* User Type Selection */}
          <div className="flex space-x-2">
            <Button
              variant={userType === "patient" ? "default" : "outline"}
              className="flex-1 flex items-center space-x-2"
              onClick={() => setUserType("patient")}
            >
              <User className="w-4 h-4" />
              <span>I am a Patient</span>
            </Button>
            <Button
              variant={userType === "doctor" ? "default" : "outline"}
              className="flex-1 flex items-center space-x-2"
              onClick={() => setUserType("doctor")}
            >
              <Stethoscope className="w-4 h-4" />
              <span>I am a Doctor</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                  variant="medical"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>


              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link 
                  to="/register-user-info-confirmation" 
                  className="text-primary hover:underline font-medium"
                >
                  Register as Patient
                </Link>
              </div>
              
              {/* Herbal Practitioner Links */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-center text-sm text-muted-foreground mb-2">Are you a herbal practitioner?</p>
                <div className="flex flex-col gap-2">
                  <Link
                    to="/herbal-login"
                    className="text-center text-sm text-emerald-600 hover:text-emerald-700 underline font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Login as Herbal Practitioner
                  </Link>
                  <Link
                    to="/herbal-register"
                    className="text-center text-sm text-muted-foreground hover:text-foreground underline transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Register as Herbal Practitioner
                  </Link>
                </div>
              </div>
              
              {userType === "doctor" && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium mb-2">
                    🚫 Doctors must use the Doctor Login section
                  </p>
                  <Link 
                    to="/doctor-login" 
                    className="text-amber-700 hover:underline font-medium text-sm inline-flex items-center gap-1"
                  >
                    Go to Doctor Login →
                  </Link>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};