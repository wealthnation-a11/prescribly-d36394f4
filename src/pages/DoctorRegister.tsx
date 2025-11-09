import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, Upload, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordValidator } from "@/components/PasswordValidator";

export const DoctorRegister = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    country: "",
    specialization: "",
    bio: "",
    licenseNumber: "",
    consultationFee: "",
    yearsOfExperience: "",
  });
  
  const [documents, setDocuments] = useState({
    governmentId: null as File | null,
    degreecert: null as File | null,
    license: null as File | null,
    specialization: null as File | null,
    cv: null as File | null,
    photo: null as File | null,
  });

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const specializations = [
    "General Practice",
    "Internal Medicine",
    "Pediatrics",
    "Obstetrics & Gynecology",
    "Surgery",
    "Cardiology",
    "Dermatology",
    "Psychiatry",
    "Orthopedics",
    "Neurology",
    "Radiology",
    "Anesthesiology",
    "Emergency Medicine",
    "Family Medicine",
    "Pathology",
    "Ophthalmology",
    "ENT (Otolaryngology)",
    "Urology",
    "Oncology",
    "Endocrinology"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (documentType: keyof typeof documents, file: File | null) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload PDF, JPG, or PNG files only.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload files smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
    }

    setDocuments({
      ...documents,
      [documentType]: file,
    });
  };

  const uploadDocument = async (file: File, documentType: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${documentType}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('doctor-documents')
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    return fileName;
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

    // Check required documents
    const requiredDocs = ['governmentId', 'degreecert', 'license', 'cv', 'photo'];
    const missingDocs = requiredDocs.filter(doc => !documents[doc as keyof typeof documents]);
    
    if (missingDocs.length > 0) {
      toast({
        title: "Missing Documents",
        description: "Please upload all required documents before proceeding.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create the user account with proper metadata
      const { error: authError } = await signUp(formData.email, formData.password, {
        first_name: formData.fullName.split(' ')[0] || formData.fullName,
        last_name: formData.fullName.split(' ').slice(1).join(' ') || '',
        phone: formData.phone,
        role: "doctor",
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        let errorMessage = authError.message;
        
        // Handle specific error cases
        if (authError.message?.includes('User already registered')) {
          errorMessage = "An account with this email already exists. Please try logging in instead.";
        } else if (authError.message?.includes('Invalid email')) {
          errorMessage = "Please enter a valid email address.";
        } else if (authError.message?.includes('Password')) {
          errorMessage = "Password does not meet security requirements.";
        }

        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get the current user after successful signup
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Upload documents
        const documentUrls: Record<string, string> = {};
        
        for (const [docType, file] of Object.entries(documents)) {
          if (file) {
            try {
              const url = await uploadDocument(file, docType, user.id);
              documentUrls[docType] = url;
            } catch (error) {
              console.error(`Failed to upload ${docType}:`, error);
            }
          }
        }

        // Wait a moment for the profile to be created by the trigger
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the profile ID from the profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          toast({
            title: "Profile Creation Error",
            description: "Error retrieving user profile. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        if (!profileData) {
          console.error('Profile not found for user:', user.id);
          toast({
            title: "Profile Creation Error",
            description: "User profile was not created properly. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create doctor profile
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert({
            user_id: user.id,
            profile_id: profileData.id,
            specialization: formData.specialization,
            bio: formData.bio,
            license_number: formData.licenseNumber,
            consultation_fee: formData.consultationFee ? parseFloat(formData.consultationFee) : null,
            years_of_experience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
            kyc_documents: {
              ...documentUrls,
              full_name: formData.fullName,
            },
            verification_status: 'pending'
          });
        
        // Update profile with country
        await supabase
          .from('profiles')
          .update({ country: formData.country })
          .eq('id', profileData.id);

        if (doctorError) {
          console.error('Doctor profile creation error:', doctorError);
          toast({
            title: "Profile Creation Error",
            description: "Account created but doctor profile setup failed. Please contact support.",
            variant: "destructive",
          });
        } else {
          setShowSuccess(true);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl text-center">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 text-success-green mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">
              ✅ Registration Submitted Successfully
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Thank you, Dr. {formData.fullName.split(' ')[0]}, for registering with Prescribly.
            </p>
            <div className="bg-medical-light rounded-lg p-6 mb-6 text-left">
              <p className="text-foreground mb-4">
                Our verification team is reviewing your documents to ensure compliance and patient safety.
              </p>
              <div className="space-y-2 text-muted-foreground">
                <p>🕐 You will receive an email update within 24–48 hours.</p>
                <p>If we need further information, our team will contact you directly.</p>
                <p>📬 Check your inbox and spam folder for emails from Prescribly.</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/login')}
              variant="medical"
              size="lg"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="mt-8">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Stethoscope className="w-6 h-6 text-primary" />
              <span className="text-2xl font-bold">Prescribly</span>
            </div>
            <CardTitle className="text-xl">Doctor Registration</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Password Validation Component */}
                <PasswordValidator
                  password={formData.password}
                  confirmPassword={formData.confirmPassword}
                  onValidationChange={setIsPasswordValid}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization *</Label>
                    <Select value={formData.specialization} onValueChange={(value) => setFormData({...formData, specialization: value})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        {specializations.map((spec) => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Medical License Number *</Label>
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      placeholder="Enter your license number"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                    <Input
                      id="yearsOfExperience"
                      name="yearsOfExperience"
                      type="number"
                      placeholder="Years of experience"
                      value={formData.yearsOfExperience}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultationFee">Consultation Fee (Optional)</Label>
                  <Input
                    id="consultationFee"
                    name="consultationFee"
                    type="number"
                    placeholder="Consultation fee in your local currency"
                    value={formData.consultationFee}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio *</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Tell us about your professional background, experience, and specialties..."
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Document Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Document Upload</h3>
                <p className="text-sm text-muted-foreground">Upload PDF, JPG, or PNG files (max 5MB each)</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Government ID */}
                  <div className="space-y-2">
                    <Label>Government-Issued ID</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('governmentId', e.target.files?.[0] || null)}
                        className="hidden"
                        id="governmentId"
                      />
                      <label htmlFor="governmentId" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {documents.governmentId ? documents.governmentId.name : "Upload ID Document"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Medical Degree */}
                  <div className="space-y-2">
                    <Label>Medical Degree Certificate</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('degreecert', e.target.files?.[0] || null)}
                        className="hidden"
                        id="degreecert"
                      />
                      <label htmlFor="degreecert" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {documents.degreecert ? documents.degreecert.name : "Upload Degree Certificate"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* License */}
                  <div className="space-y-2">
                    <Label>MDCN or Equivalent License</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('license', e.target.files?.[0] || null)}
                        className="hidden"
                        id="license"
                      />
                      <label htmlFor="license" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {documents.license ? documents.license.name : "Upload License Certificate"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Specialization Proof */}
                  <div className="space-y-2">
                    <Label>Proof of Specialization (Optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('specialization', e.target.files?.[0] || null)}
                        className="hidden"
                        id="specialization"
                      />
                      <label htmlFor="specialization" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {documents.specialization ? documents.specialization.name : "Upload Specialization Document"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* CV */}
                  <div className="space-y-2">
                    <Label>Curriculum Vitae (CV)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('cv', e.target.files?.[0] || null)}
                        className="hidden"
                        id="cv"
                      />
                      <label htmlFor="cv" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {documents.cv ? documents.cv.name : "Upload CV"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="space-y-2">
                    <Label>Professional Passport Photograph</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('photo', e.target.files?.[0] || null)}
                        className="hidden"
                        id="photo"
                      />
                      <label htmlFor="photo" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {documents.photo ? documents.photo.name : "Upload Profile Photo"}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !isPasswordValid}
                variant="medical"
                size="lg"
              >
                {loading ? "Registering..." : "Register"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};