import { useNavigate } from "react-router-dom";
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

export const HerbalMedicine = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Browse Remedies",
      description: "Explore authentic, lab-tested herbs and supplements from verified practitioners",
      icon: ShoppingBag,
      color: "text-teal-600",
      href: "/herbal/browse-remedies"
    },
    {
      title: "Read Articles",
      description: "Access knowledge from TCM, Ayurveda, and traditional medicine experts",
      icon: BookOpen,
      color: "text-green-600",
      href: "/herbal/browse-articles"
    },
    {
      title: "Find Practitioners",
      description: "Connect with certified herbalists and traditional medicine practitioners",
      icon: Users,
      color: "text-emerald-600",
      href: "/herbal/find-practitioners"
    },
    {
      title: "Personalized Plans",
      description: "Get customized herbal treatment plans based on your health profile",
      icon: Sparkles,
      color: "text-purple-600",
      badge: "Coming Soon",
      href: "#"
    },
    {
      title: "Wellness Programs",
      description: "Join holistic wellness programs combining herbs, nutrition, and lifestyle",
      icon: Heart,
      color: "text-rose-600",
      badge: "Coming Soon",
      href: "#"
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
          
          <SidebarInset className="flex-1">
            <MobileHeader title="Herbal Medicine" />

            <main className="flex-1 overflow-auto">
              <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 p-6 sm:p-8 md:p-12">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 flex-shrink-0" />
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs sm:text-sm">
                        Natural Healing
                      </Badge>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
                      Herbal Medicine & Natural Remedies
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mb-4 sm:mb-6 leading-relaxed">
                      Discover the power of nature with our comprehensive herbal medicine platform. 
                      Combining ancient wisdom with modern science for holistic wellness.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button 
                        size="lg" 
                        className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto h-12 sm:h-11 text-base"
                        onClick={() => navigate('/herbal/browse-remedies')}
                      >
                        <Pill className="mr-2 h-4 w-4" />
                        Explore Remedies
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="w-full sm:w-auto h-12 sm:h-11 text-base"
                        onClick={() => navigate('/herbal/browse-articles')}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Learn More
                      </Button>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-64 sm:h-64 bg-green-500/20 rounded-full blur-3xl"></div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {features.map((feature, index) => (
                    <Card 
                      key={feature.title}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-emerald-200"
                      onClick={() => feature.href !== '#' && navigate(feature.href)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardHeader className="pb-3 sm:pb-6">
                        <div className="flex items-start sm:items-center justify-between mb-2 gap-2">
                          <div className={`p-2 sm:p-3 rounded-lg bg-background ${feature.color} flex-shrink-0`}>
                            <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          {feature.badge && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-xs">
                              {feature.badge}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button 
                          variant="outline" 
                          className="w-full h-10 sm:h-9 text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (feature.href !== '#') {
                              navigate(feature.href);
                            }
                          }}
                        >
                          {feature.badge ? 'Coming Soon' : 'Explore'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Info Section */}
                <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                      </div>
                      <div className="flex-1 w-full">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                          Why Choose Herbal Medicine?
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
                          Our platform bridges traditional healing practices with modern healthcare, 
                          offering you access to time-tested natural remedies verified by both ancient 
                          wisdom and contemporary research. We're building a comprehensive ecosystem 
                          that includes consultations, education, and authentic products.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 text-xs">
                            <Leaf className="mr-1 h-3 w-3" />
                            100% Natural
                          </Badge>
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 text-xs">
                            <Award className="mr-1 h-3 w-3" />
                            Certified Practitioners
                          </Badge>
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 text-xs">
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
  );
};

export default HerbalMedicine;
