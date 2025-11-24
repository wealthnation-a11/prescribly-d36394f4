import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Leaf, 
  Sparkles, 
  BookOpen, 
  ShoppingBag,
  Users,
  Award,
  Heart,
  Pill
} from "lucide-react";
import { MobileHeader } from "@/components/MobileHeader";
import { 
  SidebarProvider, 
  SidebarInset 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const HerbalMedicine = () => {
  const [showComingSoon, setShowComingSoon] = useState(false);

  const features = [
    {
      title: "Herbal Consultation",
      description: "Connect with certified herbalists and traditional medicine practitioners",
      icon: Users,
      color: "text-emerald-600",
      badge: "Coming Soon"
    },
    {
      title: "Natural Remedies Library",
      description: "Explore our comprehensive database of herbs, supplements, and natural treatments",
      icon: BookOpen,
      color: "text-green-600",
      badge: "Coming Soon"
    },
    {
      title: "Herbal Shop",
      description: "Purchase authentic, lab-tested herbs and supplements from verified suppliers",
      icon: ShoppingBag,
      color: "text-teal-600",
      badge: "Coming Soon"
    },
    {
      title: "Personalized Plans",
      description: "Get customized herbal treatment plans based on your health profile",
      icon: Sparkles,
      color: "text-purple-600",
      badge: "Coming Soon"
    },
    {
      title: "Traditional Medicine",
      description: "Access knowledge from TCM, Ayurveda, African traditional medicine, and more",
      icon: Heart,
      color: "text-rose-600",
      badge: "Coming Soon"
    }
  ];

  const handleFeatureClick = () => {
    setShowComingSoon(true);
  };

  return (
    <>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <SidebarInset className="flex-1">
            <MobileHeader title="Herbal Medicine" />

            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-6 space-y-6">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 p-8 md:p-12">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Leaf className="h-8 w-8 text-emerald-600" />
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                        Natural Healing
                      </Badge>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                      Herbal Medicine & Natural Remedies
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mb-6">
                      Discover the power of nature with our comprehensive herbal medicine platform. 
                      Combining ancient wisdom with modern science for holistic wellness.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button 
                        size="lg" 
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleFeatureClick}
                      >
                        <Pill className="mr-2 h-4 w-4" />
                        Explore Remedies
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={handleFeatureClick}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Learn More
                      </Button>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl"></div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {features.map((feature, index) => (
                    <Card 
                      key={feature.title}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-emerald-200"
                      onClick={handleFeatureClick}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-3 rounded-lg bg-background ${feature.color}`}>
                            <feature.icon className="h-6 w-6" />
                          </div>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            {feature.badge}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeatureClick();
                          }}
                        >
                          Access Feature
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Info Section */}
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-emerald-100">
                        <Sparkles className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Why Choose Herbal Medicine?
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Our platform bridges traditional healing practices with modern healthcare, 
                          offering you access to time-tested natural remedies verified by both ancient 
                          wisdom and contemporary research. We're building a comprehensive ecosystem 
                          that includes consultations, education, and authentic products.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                            <Leaf className="mr-1 h-3 w-3" />
                            100% Natural
                          </Badge>
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                            <Award className="mr-1 h-3 w-3" />
                            Certified Practitioners
                          </Badge>
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                            <Heart className="mr-1 h-3 w-3" />
                            Holistic Approach
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-2xl">Coming Soon!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              We're working hard to bring you the best herbal medicine experience. 
              This feature will be available soon with exciting new capabilities.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => setShowComingSoon(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Got it, thanks!
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowComingSoon(false)}
              className="w-full"
            >
              Notify me when ready
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HerbalMedicine;
