import { Heart, Stethoscope, Bot, Activity, Shield, Users } from "lucide-react";

export const FloatingIcons = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top left area */}
      <div className="medical-icon absolute top-20 left-10 w-8 h-8 text-primary/30 md:text-primary/20">
        <Heart className="w-full h-full" />
      </div>
      
      {/* Top right area */}
      <div className="medical-icon absolute top-40 right-10 md:right-20 w-6 h-6 text-primary/40 md:text-primary/30">
        <Stethoscope className="w-full h-full" />
      </div>
      
      {/* Bottom left area */}
      <div className="medical-icon absolute bottom-40 left-10 md:left-20 w-10 h-10 text-primary/35 md:text-primary/25">
        <Bot className="w-full h-full" />
      </div>
      
      {/* Middle right area */}
      <div className="medical-icon absolute top-60 right-20 md:right-40 w-7 h-7 text-primary/30 md:text-primary/20">
        <Activity className="w-full h-full" />
      </div>
      
      {/* Bottom right area */}
      <div className="medical-icon absolute bottom-20 right-10 w-8 h-8 text-primary/40 md:text-primary/30">
        <Shield className="w-full h-full" />
      </div>
      
      {/* Top center area */}
      <div className="medical-icon absolute top-32 left-1/2 transform -translate-x-1/2 w-6 h-6 text-primary/35 md:text-primary/25">
        <Users className="w-full h-full" />
      </div>
      
      {/* Additional mobile-optimized icons */}
      <div className="medical-icon absolute top-3/4 left-1/4 w-5 h-5 text-primary/25 md:hidden">
        <Heart className="w-full h-full" />
      </div>
      
      <div className="medical-icon absolute top-1/4 right-1/4 w-5 h-5 text-primary/25 md:hidden">
        <Stethoscope className="w-full h-full" />
      </div>
    </div>
  );
};