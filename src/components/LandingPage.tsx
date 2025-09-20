import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Stethoscope, Bot, Globe, MessageSquare, Check, Linkedin, Instagram, Twitter, HelpCircle } from "lucide-react";
import { FeatureCard } from "./FeatureCard";
import { TestimonialCard } from "./TestimonialCard";
import { StatCounter } from "./StatCounter";
import { FloatingIcons } from "./FloatingIcons";
import { Header } from "./Header";
import { EnterpriseDemoModal } from "./EnterpriseDemoModal";
import { SupportForm } from "./SupportForm";
import { CustomTeamContactForm } from "./CustomTeamContactForm";
import heroImage from "@/assets/hero-doctors-team.jpg";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export const LandingPage = () => {
  const { t } = useTranslation();
  const [isEnterpriseDemoModalOpen, setIsEnterpriseDemoModalOpen] = useState(false);
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
      quote: "I was able to speak to a doctor the same day I booked—helped me feel seen and cared for.",
      author: "Amara",
      role: "Lagos",
      avatar: "👩🏾‍💼"
    },
    {
      quote: "Affordable, reliable, and empathetic. I trust Prescribly like I would a clinic.",
      author: "James",
      role: "London",
      avatar: "👨🏻‍💼"
    },
    {
      quote: "The video call was so easy. The doctor listened, diagnosed, and I got a prescription without leaving my house.",
      author: "Fatima",
      role: "Accra",
      avatar: "👩🏿‍💼"
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
            <div className="space-y-8 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground fade-in-up">
                Real Doctors. Real Care.{" "}
                <span className="text-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Anytime, Anywhere.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground fade-in-up stagger-1 leading-relaxed">
                Prescribly connects you with licensed healthcare professionals you can trust — fast, affordable, and always accessible.
              </p>
              <div className="flex flex-row gap-3 justify-center sm:justify-start fade-in-up stagger-2">
                <Button
                  variant="cta"
                  size="sm"
                  className="button-enhanced text-sm px-6 py-2"
                  onClick={() => window.location.href = '/register'}
                >
                  Get Started
                </Button>
                <Button
                  variant="medical"
                  size="sm"
                  className="button-enhanced text-sm px-6 py-2"
                  onClick={() => window.location.href = '/book-appointment'}
                >
                  Book a Doctor
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground fade-in-up stagger-3 bg-gradient-to-r from-card/80 to-medical-light/50 rounded-xl p-4 border border-prescribly-accent/20 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success-green animate-pulse"></div>
                  <Check className="w-4 h-4 text-success-green" />
                  <span className="font-medium">Licensed Professionals</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success-green animate-pulse"></div>
                  <Check className="w-4 h-4 text-success-green" />
                  <span className="font-medium">Secure & Private</span>
                </div>
              </div>
            </div>
            <div className="relative fade-in-up stagger-2">
              <img 
                src={heroImage} 
                alt="Professional healthcare consultation"
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
              {t('features')}
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

      {/* Why Prescribly Section */}
      <section id="why-prescribly" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16 fade-in-up">
            Why Patients Choose Prescribly
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Compassionate Healthcare When You Need It</CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-1 text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Clear, Fair Pricing</CardTitle>
              </CardHeader>
            </Card>

            <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-2 text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Stethoscope className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Professional & Trusted</CardTitle>
              </CardHeader>
            </Card>

            <Card className="card-gradient border-0 medical-shadow hover-lift fade-in-up stagger-3 text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Data You Control</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16 fade-in-up">
            How Prescribly Works
          </h2>
          <div className="grid md:grid-cols-5 gap-8 max-w-6xl mx-auto">
            <div className="text-center fade-in-up">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-foreground mb-2">Sign Up</h3>
              <p className="text-sm text-muted-foreground">Create your secure account</p>
            </div>
            
            <div className="text-center fade-in-up stagger-1">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-foreground mb-2">Choose Subscription</h3>
              <p className="text-sm text-muted-foreground">Select your healthcare plan</p>
            </div>

            <div className="text-center fade-in-up stagger-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-foreground mb-2">Book a Doctor</h3>
              <p className="text-sm text-muted-foreground">Schedule with licensed professionals</p>
            </div>

            <div className="text-center fade-in-up stagger-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="font-semibold text-foreground mb-2">Chat or Call</h3>
              <p className="text-sm text-muted-foreground">Connect via your preferred method</p>
            </div>

            <div className="text-center fade-in-up stagger-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-4 text-2xl font-bold">
                5
              </div>
              <h3 className="font-semibold text-foreground mb-2">Receive Care & Prescription</h3>
              <p className="text-sm text-muted-foreground">Get treatment and medications</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Promise Section */}
      <section id="our-promise" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-foreground mb-8 fade-in-up">
              Our Promise to You
            </h2>
            <div className="prose prose-lg mx-auto text-muted-foreground fade-in-up stagger-1">
              <p className="text-lg leading-relaxed">
                At Prescribly, we believe health care should be human first. Our platform connects you with compassionate, licensed healthcare professionals who truly care about your well-being. 
              </p>
              <p className="text-lg leading-relaxed mt-6">
                We promise transparent pricing, secure data handling, and healthcare that puts your needs first. Every consultation is designed to make you feel heard, understood, and cared for—because your health deserves nothing less.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16 fade-in-up">
            What Our Patients Say
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


      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4 fade-in-up">
              {t('pricing')}
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
                       <div>3 months: $30 (save $5)</div>
                       <div>6 months: $55 (save $10)</div>
                       <div>12 months: $100 (save $20)</div>
                     </div>
                    <div className="pt-2 text-xs text-orange-600 font-medium border-t border-border/20 mt-4">
                      * Extra charges are applied for doctor consultations
                    </div>
                    <Button 
                      variant="medical" 
                      className="w-full mt-6"
                      onClick={() => window.location.href = '/register'}
                    >
                      {t('get_started')}
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
                     <div className="mt-4">
                       <span className="text-4xl font-bold text-primary">$300</span>
                       <span className="text-muted-foreground">/month</span>
                     </div>
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
                      onClick={() => setIsEnterpriseDemoModalOpen(true)}
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
                    <CustomTeamContactForm />
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
                       <span className="text-4xl font-bold text-primary">$100</span>
                       <span className="text-muted-foreground">/year</span>
                     </div>
                     <div className="text-sm text-green-600 font-medium">Save $20 annually</div>
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
                    <Button 
                      variant="medical" 
                      className="w-full mt-6"
                      onClick={() => window.location.href = '/register'}
                    >
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
                     <div className="mt-4">
                       <span className="text-4xl font-bold text-primary">$300</span>
                       <span className="text-muted-foreground">/month</span>
                     </div>
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
                      onClick={() => setIsEnterpriseDemoModalOpen(true)}
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
                    <CustomTeamContactForm />
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
            {t('faq')}
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

      {/* Contact Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4 fade-in-up">
              Need Help?
            </h2>
            <p className="text-xl text-muted-foreground fade-in-up stagger-1">
              Our support team is here to assist you
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <SupportForm 
              trigger={
                <Button variant="cta" className="w-full" size="lg">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Contact Support
                </Button>
              }
              title="Get Support"
              description="Have a question or need assistance? We're here to help!"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="demo" className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8 fade-in-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
              {t('get_started')}{" "}
              <span className="text-primary">{t('app_name')}</span>
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
                  <a href="mailto:prescribly@gmail.com" className="hover:underline">prescribly@gmail.com</a>
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
            © 2025 Prescribly. All rights reserved.
          </div>
        </div>
      </footer>
      
      <EnterpriseDemoModal 
        open={isEnterpriseDemoModalOpen} 
        onOpenChange={setIsEnterpriseDemoModalOpen} 
      />
    </div>
  );
};