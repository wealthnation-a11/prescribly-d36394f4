import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { User, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordValidator } from "@/components/PasswordValidator";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
 
 export const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    country: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalHistory: "",
    allergies: "",
    currentMedications: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast({
        title: "Invalid Password",
        description: "Please ensure your password meets all requirements and passwords match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(formData.email, formData.password, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        role: "patient",
      });
      
      if (error) {
        console.error('Registration error:', error);
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to create account.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Wait for auth to complete and create patient profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Wait for profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          await supabase
            .from('profiles')
            .update({ country: formData.country })
            .eq('id', profileData.id);
          
          await supabase.from('patients').insert({
            user_id: user.id,
            profile_id: profileData.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            date_of_birth: formData.dateOfBirth,
            gender: formData.gender,
            country: formData.country,
            emergency_contact_name: formData.emergencyContactName,
            emergency_contact_phone: formData.emergencyContactPhone,
            medical_history: formData.medicalHistory,
            allergies: formData.allergies,
            current_medications: formData.currentMedications,
          });
        }

        toast({
          title: "Registration Successful!",
          description: "Redirecting to subscription page...",
        });
        navigate("/subscription");
      }
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast({
        title: "Registration Failed",
        description: "An unexpected error occurred. Please try again.",
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Logo size="lg" priority />
          </div>
          
          <div className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <User className="w-5 h-5 text-primary" />
              <span>Patient Registration</span>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                name="country"
                type="text"
                placeholder="Enter your country"
                value={formData.country}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  type="text"
                  placeholder="Emergency contact name"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone *</Label>
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  placeholder="Emergency contact phone"
                  value={formData.emergencyContactPhone}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Medical History *</Label>
              <Textarea
                id="medicalHistory"
                name="medicalHistory"
                placeholder="Any significant medical history..."
                value={formData.medicalHistory}
                onChange={handleInputChange}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies *</Label>
              <Textarea
                id="allergies"
                name="allergies"
                placeholder="Any known allergies (enter 'None' if no allergies)..."
                value={formData.allergies}
                onChange={handleInputChange}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentMedications">Current Medications *</Label>
              <Textarea
                id="currentMedications"
                name="currentMedications"
                placeholder="Current medications you're taking (enter 'None' if not taking any)..."
                value={formData.currentMedications}
                onChange={handleInputChange}
                rows={2}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Component */}
            <PasswordValidator
              password={formData.password}
              confirmPassword={formData.confirmPassword}
              onValidationChange={setIsPasswordValid}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !isPasswordValid}
              variant="medical"
            >
              {loading ? "Creating Account..." : "Create Account"}
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

          <div className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-primary hover:underline font-medium"
            >
              Sign in here
            </Link>
          </div>
          
          {/* Herbal Practitioner Links */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground mb-2">Are you a herbal practitioner?</p>
            <div className="flex flex-col gap-2">
              <Link
                to="/herbal-register"
                className="text-center text-sm text-emerald-600 hover:text-emerald-700 underline font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Register as Herbal Practitioner
              </Link>
              <Link
                to="/herbal-login"
                className="text-center text-sm text-muted-foreground hover:text-foreground underline transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Login as Herbal Practitioner
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};