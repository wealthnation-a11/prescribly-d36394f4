import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, Upload, CheckCircle, Eye, EyeOff, ShieldCheck, Globe, Award, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordValidator } from "@/components/PasswordValidator";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";

export const DoctorRegister = () => {
  const [formData, setFormData] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    phone: "", country: "", specialization: "", bio: "",
    licenseNumber: "", consultationFee: "", yearsOfExperience: "",
  });
  const [documents, setDocuments] = useState({
    governmentId: null as File | null, degreecert: null as File | null,
    license: null as File | null, specialization: null as File | null,
    cv: null as File | null, photo: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const specializations = [
    "General Practice", "Internal Medicine", "Pediatrics",
    "Obstetrics & Gynecology", "Surgery", "Cardiology",
    "Dermatology", "Psychiatry", "Orthopedics", "Neurology",
    "Radiology", "Anesthesiology", "Emergency Medicine",
    "Family Medicine", "Pathology", "Ophthalmology",
    "ENT (Otolaryngology)", "Urology", "Oncology", "Endocrinology"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (documentType: keyof typeof documents, file: File | null) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please upload PDF, JPG, or PNG files only.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Please upload files smaller than 5MB.", variant: "destructive" });
        return;
      }
    }
    setDocuments({ ...documents, [documentType]: file });
  };

  const uploadDocument = async (file: File, documentType: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${documentType}.${fileExt}`;
    const { error } = await supabase.storage.from('doctor-documents').upload(fileName, file);
    if (error) throw error;
    return fileName;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast({ title: "Invalid Password", description: "Please ensure your password meets all requirements.", variant: "destructive" });
      return;
    }
    const requiredDocs = ['governmentId', 'degreecert', 'license', 'cv', 'photo'];
    const missingDocs = requiredDocs.filter(doc => !documents[doc as keyof typeof documents]);
    if (missingDocs.length > 0) {
      toast({ title: "Missing Documents", description: "Please upload all required documents.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await signUp(formData.email, formData.password, {
        first_name: formData.fullName.split(' ')[0] || formData.fullName,
        last_name: formData.fullName.split(' ').slice(1).join(' ') || '',
        phone: formData.phone, role: "doctor",
      });
      if (authError) {
        let errorMessage = authError.message;
        if (authError.message?.includes('User already registered')) errorMessage = "An account with this email already exists.";
        toast({ title: "Registration Failed", description: errorMessage, variant: "destructive" });
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const documentUrls: Record<string, string> = {};
        for (const [docType, file] of Object.entries(documents)) {
          if (file) {
            try { documentUrls[docType] = await uploadDocument(file, docType, user.id); }
            catch (error) { console.error(`Failed to upload ${docType}:`, error); }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: profileData, error: profileError } = await supabase
          .from('profiles').select('id').eq('user_id', user.id).maybeSingle();
        if (profileError || !profileData) {
          toast({ title: "Profile Error", description: "Profile was not created properly.", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error: doctorError } = await supabase.from('doctors').insert({
          user_id: user.id, profile_id: profileData.id, specialization: formData.specialization,
          bio: formData.bio, license_number: formData.licenseNumber,
          consultation_fee: formData.consultationFee ? parseFloat(formData.consultationFee) : null,
          years_of_experience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
          kyc_documents: { ...documentUrls, full_name: formData.fullName }, verification_status: 'pending'
        });
        await supabase.from('profiles').update({ country: formData.country }).eq('id', profileData.id);
        if (doctorError) {
          toast({ title: "Profile Error", description: "Account created but doctor profile setup failed.", variant: "destructive" });
        } else {
          setShowSuccess(true);
        }
      }
    } catch (error) {
      toast({ title: "Registration Failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
    setLoading(false);
  };

  const benefits = [
    { icon: Globe, title: "Global Reach", desc: "Connect with patients worldwide" },
    { icon: ShieldCheck, title: "Verified Platform", desc: "Trusted & HIPAA-compliant" },
    { icon: Award, title: "Earn More", desc: "Set your own consultation fees" },
    { icon: Clock, title: "Flexible Hours", desc: "Work on your own schedule" },
  ];

  const stepVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  const FileUploadBox = ({ id, label, file }: { id: keyof typeof documents; label: string; file: File | null }) => (
    <motion.div 
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 cursor-pointer group
        ${file 
          ? 'border-primary/50 bg-primary/5' 
          : 'border-border hover:border-primary/40 hover:bg-primary/5'
        }`}
      >
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(id, e.target.files?.[0] || null)} className="hidden" id={id} />
        <label htmlFor={id} className="cursor-pointer block">
          {file ? (
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
              <p className="text-sm text-primary font-medium truncate max-w-[180px]">{file.name}</p>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</p>
            </>
          )}
        </label>
      </div>
    </motion.div>
  );

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }}>
          <Card className="w-full max-w-lg text-center border-primary/20 shadow-2xl">
            <CardContent className="p-8 md:p-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-primary-foreground" />
                </div>
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Registration Submitted!</h1>
              <p className="text-muted-foreground mb-6">
                Thank you, Dr. {formData.fullName.split(' ')[0]}. Our team is reviewing your application.
              </p>
              <div className="bg-secondary rounded-xl p-5 mb-6 text-left space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Review within 24–48 hours</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Email notification on approval</p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground" size="lg">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--primary)/0.05)] via-background to-[hsl(var(--accent)/0.08)]">
      <div className="flex flex-col lg:flex-row min-h-screen">
        
        {/* Left Panel — Branding (hidden on mobile, shown on lg+) */}
        <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-gradient-to-br from-primary to-[hsl(var(--accent))] text-primary-foreground flex-col justify-between p-10 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-sm" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
          
          <div className="relative z-10">
            <Logo size="lg" priority />
            <motion.h1 
              className="text-3xl xl:text-4xl font-bold mt-10 leading-tight"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            >
              Join Africa's Leading<br />Digital Health Platform
            </motion.h1>
            <motion.p 
              className="text-primary-foreground/80 mt-4 text-lg"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            >
              Register as a doctor and start consulting patients online.
            </motion.p>
          </div>

          <div className="relative z-10 space-y-4 mt-8">
            {benefits.map((b, i) => (
              <motion.div 
                key={b.title}
                className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4"
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-primary-foreground/70">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="lg:hidden bg-gradient-to-r from-primary to-[hsl(var(--accent))] p-6 text-primary-foreground">
            <div className="flex items-center gap-3 mb-3">
              <Logo size="sm" priority />
            </div>
            <h1 className="text-xl font-bold">Doctor Registration</h1>
            <p className="text-sm text-primary-foreground/80">Join Prescribly's medical network</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
            <div className="max-w-2xl mx-auto">
              
              {/* Desktop Title */}
              <motion.div 
                className="hidden lg:block mb-8"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Doctor Registration</h2>
                </div>
                <p className="text-muted-foreground">Fill in your details to create your doctor profile</p>
              </motion.div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                  <button key={s} onClick={() => s < step ? setStep(s) : undefined} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                      ${step >= s 
                        ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30' 
                        : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                    </div>
                    <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                  </button>
                ))}
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  {step === 1 ? "Personal Info" : step === 2 ? "Professional" : "Documents"}
                </span>
              </div>

              <form onSubmit={handleRegister}>
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name *</Label>
                          <Input id="fullName" name="fullName" placeholder="Dr. John Doe" value={formData.fullName} onChange={handleInputChange} required className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input id="email" name="email" type="email" placeholder="doctor@example.com" value={formData.email} onChange={handleInputChange} required className="h-11" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <div className="relative">
                            <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={formData.password} onChange={handleInputChange} required className="pr-10 h-11" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password *</Label>
                          <div className="relative">
                            <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm password" value={formData.confirmPassword} onChange={handleInputChange} required className="pr-10 h-11" />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <PasswordValidator password={formData.password} confirmPassword={formData.confirmPassword} onValidationChange={setIsPasswordValid} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input id="phone" name="phone" type="tel" placeholder="+234 800 000 0000" value={formData.phone} onChange={handleInputChange} required className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Input id="country" name="country" placeholder="Nigeria" value={formData.country} onChange={handleInputChange} required className="h-11" />
                        </div>
                      </div>
                      <Button type="button" onClick={() => setStep(2)} className="w-full h-12 bg-gradient-to-r from-primary to-[hsl(var(--accent))] hover:opacity-90 text-primary-foreground font-semibold text-base">
                        Continue to Professional Info →
                      </Button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Specialization *</Label>
                          <Select value={formData.specialization} onValueChange={(v) => setFormData({...formData, specialization: v})}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select specialization" /></SelectTrigger>
                            <SelectContent>
                              {specializations.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="licenseNumber">License Number *</Label>
                          <Input id="licenseNumber" name="licenseNumber" placeholder="MDCN/2024/XXXXX" value={formData.licenseNumber} onChange={handleInputChange} required className="h-11" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                          <Input id="yearsOfExperience" name="yearsOfExperience" type="number" placeholder="5" value={formData.yearsOfExperience} onChange={handleInputChange} min="0" required className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="consultationFee">Consultation Fee (Optional)</Label>
                          <Input id="consultationFee" name="consultationFee" type="number" placeholder="5000" value={formData.consultationFee} onChange={handleInputChange} min="0" step="0.01" className="h-11" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Bio *</Label>
                        <Textarea id="bio" name="bio" placeholder="Tell us about your experience, specialties, and what drives your practice..." value={formData.bio} onChange={handleInputChange} rows={4} required className="resize-none" />
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">← Back</Button>
                        <Button type="button" onClick={() => setStep(3)} className="flex-1 h-12 bg-gradient-to-r from-primary to-[hsl(var(--accent))] hover:opacity-90 text-primary-foreground font-semibold">
                          Continue to Documents →
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
                      <div className="bg-secondary/50 border border-primary/10 rounded-xl p-4 mb-2">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          Upload PDF, JPG, or PNG files (max 5MB each). All documents are securely encrypted.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadBox id="governmentId" label="Government-Issued ID *" file={documents.governmentId} />
                        <FileUploadBox id="degreecert" label="Medical Degree Certificate *" file={documents.degreecert} />
                        <FileUploadBox id="license" label="MDCN or Equivalent License *" file={documents.license} />
                        <FileUploadBox id="specialization" label="Proof of Specialization" file={documents.specialization} />
                        <FileUploadBox id="cv" label="Curriculum Vitae (CV) *" file={documents.cv} />
                        <FileUploadBox id="photo" label="Professional Photo *" file={documents.photo} />
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-12">← Back</Button>
                        <Button 
                          type="submit" 
                          disabled={loading || !isPasswordValid}
                          className="flex-1 h-12 bg-gradient-to-r from-primary to-[hsl(var(--accent))] hover:opacity-90 text-primary-foreground font-semibold text-base"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                              Registering...
                            </span>
                          ) : "Submit Registration"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-semibold">Sign in here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
