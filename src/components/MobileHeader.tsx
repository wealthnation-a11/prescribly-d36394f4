import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "./NotificationBell";
import { HelpCircle, Menu } from "lucide-react";
import { Link } from "react-router-dom";

interface MobileHeaderProps {
  title: string;
  showSupportButton?: boolean;
}

export const MobileHeader = ({ title, showSupportButton = true }: MobileHeaderProps) => {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 sm:px-6 sticky top-0 z-40">
      {/* Mobile Menu Trigger */}
      <SidebarTrigger className="text-muted-foreground hover:text-foreground lg:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </SidebarTrigger>
      
      {/* Desktop spacer when sidebar is visible */}
      <div className="hidden lg:block lg:w-4" />
      
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>
      
      {/* Mobile Notification Bell and Support Button */}
      <div className="flex items-center gap-2 lg:hidden">
        <NotificationBell size="sm" />
        {showSupportButton && (
          <Link to="/support">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <HelpCircle className="h-4 w-4" />
              <span className="sr-only">Support</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};