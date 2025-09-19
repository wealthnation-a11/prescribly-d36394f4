import { SupportForm } from "@/components/SupportForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Mail, Phone, MessageSquare, Clock, HelpCircle } from "lucide-react";

export const Support = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1">
              <h1 className="text-heading text-foreground">Support Center</h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="container mx-auto max-w-4xl space-y-8">
              {/* Hero Section */}
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold text-foreground">How can we help you?</h1>
                <p className="text-muted-foreground text-lg">
                  Get support for your health journey. We're here to help you every step of the way.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle>Submit a Support Ticket</CardTitle>
                    <CardDescription>
                      Get personalized help from our support team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <SupportForm
                      trigger={
                        <Button className="w-full">
                          <HelpCircle className="w-4 h-4 mr-2" />
                          Create Support Ticket
                        </Button>
                      }
                    />
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <Mail className="w-6 h-6 text-green-600" />
                    </div>
                    <CardTitle>Email Us Directly</CardTitle>
                    <CardDescription>
                      Send us an email for general inquiries
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = 'mailto:prescribly@gmail.com'}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      prescribly@gmail.com
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Common Issues */}
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Find quick answers to common questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="border-l-4 border-primary pl-4">
                      <h4 className="font-semibold text-foreground">How do I book an appointment?</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Navigate to "Book Appointment" from your dashboard and select an available doctor and time slot.
                      </p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="font-semibold text-foreground">How do I access my prescriptions?</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Go to "My Prescriptions" in the sidebar to view all your medical prescriptions and history.
                      </p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-foreground">How do I update my profile information?</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Click on "Profile" in the sidebar to update your personal information and health details.
                      </p>
                    </div>
                    <div className="border-l-4 border-orange-500 pl-4">
                      <h4 className="font-semibold text-foreground">What if I have billing issues?</h4>
                      <p className="text-muted-foreground text-sm mt-1">
                        Create a support ticket with category "Billing & Subscription" and we'll resolve it quickly.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Support Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-foreground">Email Support</p>
                      <p className="text-muted-foreground text-sm">24/7 - We'll respond within 24 hours</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Response Time</p>
                      <p className="text-muted-foreground text-sm">Usually within 2-4 hours during business days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Support;