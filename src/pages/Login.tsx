import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const Login = () => {
  const [userType, setUserType] = useState<"patient" | "doctor">("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <span className="text-2xl font-bold">Prescribly</span>
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

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                {userType === "patient" ? (
                  <Link 
                    to="/register-user-info-confirmation" 
                    className="text-primary hover:underline font-medium"
                  >
                    Register here
                  </Link>
                ) : (
                  <Link 
                    to="/register-doctor-info-confirmation" 
                    className="text-primary hover:underline font-medium"
                  >
                    Register as Doctor
                  </Link>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};