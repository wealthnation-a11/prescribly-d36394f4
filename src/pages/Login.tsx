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
import { LanguageSelector } from "@/components/LanguageSelector";

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
    
    // Allow admin login regardless of user type selection
    const isAdminEmail = email === "admin@prescriblyadmin.lovable.app";
    
    // Block doctors from logging in through patient login (unless admin)
    if (userType === "doctor" && !isAdminEmail) {
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
        
        // Check if admin user and redirect accordingly
        if (email === "admin@prescriblyadmin.lovable.app") {
          navigate("/admin-dashboard");
        } else {
          // Redirect to dashboard which will handle role-based routing
          navigate("/dashboard");
        }
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

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
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
                  <Label htmlFor="password">Password</Label>
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

              <div className="mt-3">
                <Button
                  type="button"
                  variant="oauth"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  aria-label="Continue with Google"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.4 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 19.5-8.9 19.5-20c0-1.3-.1-2.7-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 15.5 4 8.2 8.6 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 10.1-2 13.6-5.2l-6.3-5.2C29.1 35.6 26.7 36 24 36c-5.2 0-9.6-3.6-11.2-8.4l-6.5 5C8.2 39.4 15.5 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.3 5.1-6.7 6.6l6.3 5.2C38.1 37.7 44 33 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link 
                  to="/register-user-info-confirmation" 
                  className="text-primary hover:underline font-medium"
                >
                  Register as Patient
                </Link>
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