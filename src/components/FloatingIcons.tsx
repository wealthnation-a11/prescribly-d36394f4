import { Heart, Stethoscope, Bot } from "lucide-react";

export const FloatingIcons = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="medical-icon absolute top-20 left-10 w-8 h-8 text-primary/20">
        <Heart className="w-full h-full" />
      </div>
      <div className="medical-icon absolute top-40 right-20 w-6 h-6 text-primary/30">
        <Stethoscope className="w-full h-full" />
      </div>
      <div className="medical-icon absolute bottom-40 left-20 w-10 h-10 text-primary/25">
        <Bot className="w-full h-full" />
      </div>
      <div className="medical-icon absolute top-60 right-40 w-7 h-7 text-primary/20">
        <Heart className="w-full h-full" />
      </div>
      <div className="medical-icon absolute bottom-20 right-10 w-8 h-8 text-primary/30">
        <Stethoscope className="w-full h-full" />
      </div>
      <div className="medical-icon absolute top-32 left-1/2 w-6 h-6 text-primary/25">
        <Bot className="w-full h-full" />
      </div>
    </div>
  );
};