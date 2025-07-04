import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Stethoscope, Calendar, Pill, MessageSquare, User, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [rememberLocation, setRememberLocation] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, [user]);

  const handleBookDoctor = () => {
    setShowLocationModal(true);
  };

  const handleLocationSubmit = () => {
    if (selectedCountry && selectedState) {
      setShowLocationModal(false);
      navigate('/book-appointment', { 
        state: { country: selectedCountry, state: selectedState } 
      });
    }
  };

  const quickActions = [
    {
      icon: Stethoscope,
      title: "Check Symptoms",
      description: "Get AI-powered health insights",
      action: () => navigate('/symptom-form'),
      color: "bg-primary"
    },
    {
      icon: Calendar,
      title: "Book a Doctor",
      description: "Find verified doctors nearby",
      action: handleBookDoctor,
      color: "bg-success-green"
    },
    {
      icon: Pill,
      title: "View Prescriptions",
      description: "Access your prescription history",
      action: () => navigate('/my-prescriptions'),
      color: "bg-medical-blue"
    }
  ];

  const bottomNavItems = [
    { icon: Home, label: "Home", path: "/dashboard", active: true },
    { icon: Calendar, label: "Appointments", path: "/appointments" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: User, label: "Profile", path: "/profile" }
  ];

  const getCurrentTime = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary to-primary-glow p-6 text-white">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-1">
            {getCurrentTime()}, {userProfile?.first_name || 'User'}!
          </h1>
          <p className="text-primary-foreground/80">
            Your health companion is here to support you
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-md mx-auto p-6 -mt-8">
        <div className="space-y-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              onClick={action.action}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${action.color} text-white`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground">
                      {action.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              No recent activity. Start by checking your symptoms or booking a doctor.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Location Selection Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Select Your Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nigeria">Nigeria</SelectItem>
                  <SelectItem value="ghana">Ghana</SelectItem>
                  <SelectItem value="kenya">Kenya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State/Region</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lagos">Lagos</SelectItem>
                  <SelectItem value="abuja">Abuja</SelectItem>
                  <SelectItem value="kano">Kano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember-location"
                checked={rememberLocation}
                onCheckedChange={(checked) => setRememberLocation(checked === true)}
              />
              <label htmlFor="remember-location" className="text-sm">
                Remember this location for next time
              </label>
            </div>

            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowLocationModal(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleLocationSubmit}
                disabled={!selectedCountry || !selectedState}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-4 py-2">
            {bottomNavItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center py-2 px-1 ${
                  item.active 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  );
};

export default Dashboard;