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
    <header className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b border-border bg-background/95 backdrop-blur px-3 sm:px-6 sticky top-0 z-40">
      {/* Mobile Menu Trigger */}
      <SidebarTrigger className="text-muted-foreground hover:text-foreground lg:hidden min-w-[40px]">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </SidebarTrigger>
      
      {/* Desktop spacer when sidebar is visible */}
      <div className="hidden lg:block lg:w-4" />
      
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>
      
      {/* Mobile Notification Bell and Support Button */}
      <div className="flex items-center gap-1 sm:gap-2 lg:hidden flex-shrink-0">
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