import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const jobPositions = {
  "doctor-onboarding-specialist": {
    title: "Doctor Onboarding Specialist",
    description: "Guide clinicians through credentialing and ensure a world‑class onboarding experience."
  },
  "frontend-developer": {
    title: "Frontend Developer", 
    description: "Build elegant, performant interfaces that clinicians and patients love."
  },
  "patient-support-agent": {
    title: "Patient Support Agent",
    description: "Support patients with compassion and resolve issues quickly across channels."
  },
  "ui-ux-designer": {
    title: "UI/UX Designer",
    description: "Design intuitive healthcare experiences that prioritize user needs and accessibility."
  }
};

export default function JobApplication() {
  const { position } = useParams<{ position: string }>();
  const navigate = useNavigate();
  
  const jobInfo = jobPositions[position as keyof typeof jobPositions];
  
  usePageSEO({
    title: `Apply for ${jobInfo?.title || 'Position'} | Prescribly Careers`,
    description: `Submit your application for ${jobInfo?.title || 'this position'} at Prescribly. Join our mission to revolutionize healthcare.`,
    canonicalPath: `/careers/apply/${position}`,
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    experience: "",
    coverLetter: "",
    portfolio: "",
    availability: ""
  });

  if (!jobInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Position Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">The requested position could not be found.</p>
            <Button onClick={() => navigate("/careers")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Careers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.coverLetter) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Create email content
    const subject = `Job Application: ${jobInfo.title} - ${formData.fullName}`;
    const body = `
Dear Prescribly Hiring Team,

I am applying for the ${jobInfo.title} position.

APPLICANT DETAILS:
Name: ${formData.fullName}
Email: ${formData.email}
Phone: ${formData.phone || 'Not provided'}
Location: ${formData.location || 'Not provided'}
Years of Experience: ${formData.experience || 'Not specified'}
Availability: ${formData.availability || 'Not specified'}

PORTFOLIO/WEBSITE:
${formData.portfolio || 'Not provided'}

COVER LETTER:
${formData.coverLetter}

Best regards,
${formData.fullName}
    `.trim();

    // Create Gmail link
    const gmailLink = `https://mail.google.com/mail/?view=cm&to=prescibly@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open Gmail in new tab
    window.open(gmailLink, '_blank');
    
    toast.success("Opening Gmail with your application details!");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <Button 
            onClick={() => navigate("/careers")} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Careers
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Apply for {jobInfo.title}</h1>
          <p className="text-muted-foreground mt-2">{jobInfo.description}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Select onValueChange={(value) => handleInputChange("experience", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="2-3">2-3 years</SelectItem>
                      <SelectItem value="4-6">4-6 years</SelectItem>
                      <SelectItem value="7-10">7-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="availability">Availability</Label>
                  <Select onValueChange={(value) => handleInputChange("availability", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="When can you start?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="2-weeks">2 weeks notice</SelectItem>
                      <SelectItem value="1-month">1 month</SelectItem>
                      <SelectItem value="2-months">2 months</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="portfolio">Portfolio/Website URL</Label>
                <Input
                  id="portfolio"
                  type="url"
                  placeholder="https://your-portfolio.com"
                  value={formData.portfolio}
                  onChange={(e) => handleInputChange("portfolio", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="coverLetter">Cover Letter *</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell us why you're interested in this role and what makes you a great fit..."
                  className="min-h-[120px]"
                  value={formData.coverLetter}
                  onChange={(e) => handleInputChange("coverLetter", e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" variant="medical">
                Send Application via Gmail
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                This will open Gmail with your application pre-filled to send to prescibly@gmail.com
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}