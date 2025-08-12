import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Stethoscope, Bot, Globe, MessageSquare, Check, PhoneCall, Linkedin, Instagram, Twitter } from "lucide-react";
import { FeatureCard } from "./FeatureCard";
import { TestimonialCard } from "./TestimonialCard";
import { StatCounter } from "./StatCounter";
import { FloatingIcons } from "./FloatingIcons";
import { Header } from "./Header";
import heroImage from "@/assets/hero-doctor.jpg";
import { Link } from "react-router-dom";

export const LandingPage = () => {
  const features = [
    {
      icon: Bot,
      title: "AI Symptom Checker",
      description: "Get instant analysis of your symptoms",
      details: "Our advanced AI analyzes your symptoms and provides preliminary diagnosis recommendations in seconds."
    },
    {
      icon: Stethoscope,
      title: "Book a Doctor Instantly",
      description: "Connect with verified doctors 24/7",
      details: "Schedule consultations with licensed medical professionals available around the clock."
    },
    {
      icon: Heart,
      title: "Personalized Prescriptions",
      description: "Receive tailored treatment plans",
      details: "Get customized medication recommendations and treatment plans based on your specific condition."
    },
    {
      icon: Bot,
      title: "Medical Record History",
      description: "Secure digital health records",
      details: "Access your complete medical history anytime, anywhere with bank-level security."
    },
    {
      icon: Stethoscope,
      title: "Doctor Dashboard",
      description: "Comprehensive practice management",
      details: "Streamlined tools for doctors to manage patients, consultations, and grow their practice."
    }
  ];

  const testimonials = [
    {
      quote: "Prescribly helped me get answers at 2am when clinics were closed. The AI diagnosis was spot-on!",
      author: "Sarah Johnson",
      role: "Patient",
      avatar: "👩‍💼"
    },
    {
      quote: "Finally, a platform that connects me with patients without stress. I've doubled my consultation income!",
      author: "Dr. Michael Chen",
      role: "Family Medicine",
      avatar: "👨‍⚕️"
    },
    {
      quote: "My child's health issue was addressed in minutes! The doctor was professional and caring.",
      author: "Maria Rodriguez",
      role: "Parent",
      avatar: "👩‍👧"
    }
  ];

  const faqs = [
    {
      question: "Is Prescribly really free?",
      answer: "No."
    },
    {
      question: "Can I talk to a real doctor?",
      answer: "Absolutely! All our doctors are licensed medical professionals. The AI provides initial analysis, then connects you with real doctors for consultations."
    },
    {
      question: "How is my data protected?",
      answer: "We use bank-level encryption and comply with HIPAA regulations. Your medical data is stored securely and never shared without your consent."
    },
    {
      question: "Is AI better than physical checkups?",
      answer: "AI complements, not replaces, traditional healthcare. It provides quick initial analysis and connects you with doctors for comprehensive care when needed."
    },
    {
      question: "How do I get started as a doctor?",
      answer: "Simply apply through our doctor portal with your medical license. Our team verifies credentials within 24-48 hours."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <FloatingIcons />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-7xl font-bold text-foreground fade-in-up">
                AI Healthcare in Your{" "}
                <span className="text-primary">Pocket</span>
              </h1>
              <p className="text-xl text-muted-foreground fade-in-up stagger-1">
                Get instant symptom analysis, real-time doctor consultations, and AI-prescribed treatments.
              </p>
              <div className="text-sm text-muted-foreground fade-in-up stagger-3">
                ✨ Made with AI • Trusted by 50,000+ patients worldwide
              </div>
            </div>
            <div className="relative fade-in-up stagger-2">
              <img 
                src={heroImage} 
                alt="AI Doctor Avatar"
                width={1200}
                height={800}
                className="w-full h-auto rounded-2xl medical-shadow floating-animation"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="offer" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4 fade-in-up">
              What Prescribly Offers
            </h2>
            <p className="text-xl text-muted-foreground fade-in-up stagger-1">
              Comprehensive healthcare solutions at your fingertips
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                details={feature.details}
                delay={`stagger-${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section id="about" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16 fade-in-up">
            Who It's For
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up">
              <CardHeader className="text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">For Patients</CardTitle>
                <CardDescription>Healthcare when you need it most</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span>24/7 access to medical guidance</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span>Fast diagnosis and treatment</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span>Affordable care for everyone</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-1">
              <CardHeader className="text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-trust-blue/10 flex items-center justify-center mb-4">
                  <Stethoscope className="w-10 h-10 text-trust-blue" />
                </div>
                <CardTitle className="text-2xl">For Doctors</CardTitle>
                <CardDescription>Grow your practice digitally</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-trust-blue"></div>
                  <span>Verified access and credibility</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-trust-blue"></div>
                  <span>Manage consultations efficiently</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-trust-blue"></div>
                  <span>Earn and grow your reputation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16 fade-in-up">
            What Our Users Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.author} className={`fade-in-up stagger-${index + 1}`}>
                <TestimonialCard {...testimonial} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16 fade-in-up">
            Global Impact
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center fade-in-up">
              <div className="text-4xl mb-2">🌍</div>
              <div className="text-4xl font-bold text-black mb-2">5+</div>
              <div className="text-muted-foreground font-medium">Countries Served</div>
            </div>
            
            <div className="text-center fade-in-up stagger-1">
              <div className="text-4xl mb-2">💬</div>
              <div className="text-4xl font-bold text-black mb-2">200+</div>
              <div className="text-muted-foreground font-medium">Diagnoses Made</div>
            </div>
            
            <div className="text-center fade-in-up stagger-2">
              <div className="text-4xl mb-2">👨‍⚕️</div>
              <div className="text-4xl font-bold text-black mb-2">30+</div>
              <div className="text-muted-foreground font-medium">Doctors Onboarded</div>
            </div>
            
            <div className="text-center fade-in-up stagger-3">
              <div className="text-4xl mb-2">🩺</div>
              <div className="text-4xl font-bold text-black mb-2">100+</div>
              <div className="text-muted-foreground font-medium">Consultations Completed</div>
            </div>
          </div>

          {/* HIPAA Trust Badge */}
          <div className="mt-12">
            <Card className="max-w-2xl mx-auto text-center bg-secondary/20 border border-border/40 medical-shadow">
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <img
                  src="/lovable-uploads/9f00ef92-4c12-42f5-969f-1de0ee582693.png"
                  alt="HIPAA compliant certification badge - Prescribly HIPAA certified"
                  width={120}
                  height={48}
                  loading="lazy"
                  className="w-24 md:w-28 h-auto"
                />
                <h3 className="text-lg font-semibold text-foreground">Prescribly is HIPAA Certified</h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Your medical data is encrypted, protected, and handled according to U.S. federal privacy standards.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4 fade-in-up">
              Choose Your Plan
            </h2>
            <p className="text-xl text-muted-foreground fade-in-up stagger-1">
              Flexible pricing options for individuals and organizations
            </p>
          </div>
          
          <Tabs defaultValue="monthly" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="grid w-full max-w-md grid-cols-2 fade-in-up">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="monthly" className="space-y-8">
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Individual Plan */}
                <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up relative">
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-2">Individual</CardTitle>
                    <CardDescription>Perfect for personal healthcare needs</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-primary">$10</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>AI Symptom Analysis</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>24/7 Doctor Consultations</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Medical Records Storage</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Prescription Management</span>
                    </div>
                    <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                      <div>3 months: $25 (save $5)</div>
                      <div>6 months: $55 (save $5)</div>
                      <div>12 months: $110 (save $10)</div>
                    </div>
                    <div className="pt-2 text-xs text-orange-600 font-medium border-t border-border/20 mt-4">
                      * Extra charges are applied for doctor consultations
                    </div>
                    <Button variant="medical" className="w-full mt-6">
                      Get Started
                    </Button>
                  </CardContent>
                </Card>

                {/* Healthcare Plans for Organizations (Monthly) */}
                <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-1 relative ring-1 ring-primary/20">
                  <CardHeader className="text-center pb-6 pt-8 space-y-2">
                    <div className="flex justify-center">
                      <Badge variant="secondary" className="px-3 py-1 rounded-full">
                        Perfect for Hospitals & Clinics
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl mb-1">Healthcare Plans for Organizations</CardTitle>
                    <CardDescription>
                      Built to support hospitals, clinics, and large healthcare teams with powerful tools and enterprise-grade support.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Unlimited Licensed Doctor Access</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>AI-Powered Triage & Diagnostics</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Multi-Clinic Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Patient Record Synchronization</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>HIPAA / NDPR / GDPR Compliance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Dedicated Account Manager</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Custom Analytics & Reporting</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Integration with Hospital Systems (EHR, EMR, etc.)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Priority Deployment & Staff Training</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Direct Line to Medical Support & Engineering Teams</span>
                    </div>
                    <div className="pt-2 text-xs text-orange-600 font-medium border-t border-border/20 mt-4">
                      * Extra charges are applied for doctor consultations
                    </div>
                    <Button
                      variant="cta"
                      className="w-full mt-4"
                      aria-label="Request Enterprise Demo"
                      onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Request Enterprise Demo
                    </Button>
                  </CardContent>
                </Card>

                {/* Custom Team Plan */}
                <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-2">
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-2">Custom Team</CardTitle>
                    <CardDescription>Tailored solutions for your organization</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-primary">Custom</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Custom Feature Development</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Dedicated Account Manager</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>On-premise Deployment</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>24/7 Premium Support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Training & Onboarding</span>
                    </div>
                    <Button variant="outline" className="w-full mt-6">
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="yearly" className="space-y-8">
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Individual Plan - Yearly */}
                <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up relative">
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-2">Individual</CardTitle>
                    <CardDescription>Perfect for personal healthcare needs</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-primary">$110</span>
                      <span className="text-muted-foreground">/year</span>
                    </div>
                    <div className="text-sm text-green-600 font-medium">Save $10 annually</div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>AI Symptom Analysis</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>24/7 Doctor Consultations</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Medical Records Storage</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Prescription Management</span>
                    </div>
                    <div className="pt-2 text-xs text-orange-600 font-medium border-t border-border/20 mt-4">
                      * Extra charges are applied for doctor consultations
                    </div>
                    <Button variant="medical" className="w-full mt-6">
                      Get Started
                    </Button>
                  </CardContent>
                </Card>

                {/* Healthcare Plans for Organizations (Yearly) */}
                <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-1 relative ring-1 ring-primary/20">
                  <CardHeader className="text-center pb-6 pt-8 space-y-2">
                    <div className="flex justify-center">
                      <Badge variant="secondary" className="px-3 py-1 rounded-full">
                        Perfect for Hospitals & Clinics
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl mb-1">Healthcare Plans for Organizations</CardTitle>
                    <CardDescription>
                      Built to support hospitals, clinics, and large healthcare teams with powerful tools and enterprise-grade support.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Unlimited Licensed Doctor Access</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>AI-Powered Triage & Diagnostics</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Multi-Clinic Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Patient Record Synchronization</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>HIPAA / NDPR / GDPR Compliance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Dedicated Account Manager</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Custom Analytics & Reporting</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Integration with Hospital Systems (EHR, EMR, etc.)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Priority Deployment & Staff Training</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Direct Line to Medical Support & Engineering Teams</span>
                    </div>
                    <div className="pt-2 text-xs text-orange-600 font-medium border-t border-border/20 mt-4">
                      * Extra charges are applied for doctor consultations
                    </div>
                    <Button
                      variant="cta"
                      className="w-full mt-4"
                      aria-label="Request Enterprise Demo"
                      onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Request Enterprise Demo
                    </Button>
                  </CardContent>
                </Card>

                {/* Custom Team Plan - Yearly */}
                <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-2">
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-2">Custom Team</CardTitle>
                    <CardDescription>Tailored solutions for your organization</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-primary">Custom</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Custom Feature Development</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Dedicated Account Manager</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>On-premise Deployment</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>24/7 Premium Support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span>Training & Onboarding</span>
                    </div>
                    <Button variant="outline" className="w-full mt-6">
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16 fade-in-up">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4 fade-in-up">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="card-gradient border-0 medical-shadow rounded-lg px-6"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section id="demo" className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8 fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
              Start Your Health Journey with {" "}
              <span className="text-primary">Prescribly</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of patients and doctors who trust Prescribly for better healthcare outcomes.
            </p>
            <Button
              variant="cta"
              size="lg"
              className="text-xl px-12 py-6"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              aria-label="Go to contact section"
            >
              Sign Up Now
            </Button>
            <div className="text-sm text-muted-foreground">
              🚀 Free to start • No credit card required • 5-star rated
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-primary">Prescribly</h3>
              <p className="text-background/80">Doctor in Your Pocket</p>
              <p className="text-sm text-background/60">
                Revolutionizing healthcare with AI-powered solutions for patients and doctors worldwide.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-background">Company</h4>
              <ul className="space-y-2 text-sm text-background/80 list-disc list-inside">
                <li><Link to="/about" className="hover:underline">About</Link></li>
                <li><Link to="/blog" className="hover:underline">Blog</Link></li>
                <li><Link to="/press" className="hover:underline">Press</Link></li>
                <li><Link to="/careers" className="hover:underline">Careers</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-background">Legal</h4>
              <ul className="space-y-2 text-sm text-background/80 list-disc list-inside">
                <li><Link to="/terms" className="hover:underline">Terms of Use</Link></li>
                <li><Link to="/privacy" className="hover:underline">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="hover:underline">Cookies Policy</Link></li>
                <li><Link to="/hipaa-compliance" className="hover:underline">HIPAA Compliance</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-background">Contact</h4>
              <div className="space-y-3 text-sm text-background/80">
                <div>
                  <a href="mailto:support@prescribly.app" className="hover:underline">support@prescribly.app</a>
                </div>
                <nav aria-label="Social media" className="flex items-center gap-4">
                  <a
                    href="https://www.linkedin.com/in/bonaventure-joshua-augustine-526b81374?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="text-background hover:text-primary transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href="https://www.instagram.com/prescribly?igsh=MWo5azZ5bXVia2FpNQ=="
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-background hover:text-primary transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://x.com/prescribly?t=WvKfzzmqXkht038Y1Mxjog&s=09"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter/X"
                    className="text-background hover:text-primary transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                </nav>
              </div>
            </div>
          </div>
          <div className="border-t border-background/20 mt-12 pt-8 text-center text-sm text-background/60">
            © 2024 Prescribly. All rights reserved. Made with AI ✨
          </div>
        </div>
      </footer>
    </div>
  );
};