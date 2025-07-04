import { Button } from "@/components/ui/button";
import { Globe, MessageSquare, Stethoscope } from "lucide-react";

export const Header = () => {
  const menuItems = [
    { name: "Home", href: "#home" },
    { name: "Offer", href: "#offer" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">Prescribly</span>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              Login
            </Button>
            <Button variant="medical" size="sm">
              Sign Up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden">
            <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
              <div className="w-4 h-0.5 bg-foreground"></div>
              <div className="w-4 h-0.5 bg-foreground"></div>
              <div className="w-4 h-0.5 bg-foreground"></div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};