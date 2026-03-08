import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { DoctorSidebar } from "./DoctorSidebar";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";

interface DoctorLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export function DoctorLayout({ children, title, subtitle, showBackButton = true }: DoctorLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <DoctorSidebar />
        
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 sm:h-16 border-b bg-background/95 backdrop-blur flex items-center px-3 sm:px-6 sticky top-0 z-40 gap-2 sm:gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground min-w-[40px]">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </SidebarTrigger>
            
            {/* Logo on mobile */}
            <div className="lg:hidden flex-shrink-0">
              <Logo size="sm" withLink />
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-4">
              {showBackButton && (
                <Link to="/doctor-dashboard" className="hidden sm:block flex-shrink-0">
                  <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary/80 hover:bg-primary/5">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden md:inline">Back to Dashboard</span>
                  </Button>
                </Link>
              )}
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block truncate">{subtitle}</p>}
              </div>
            </div>

            {/* Mobile notification */}
            <div className="flex items-center gap-1 lg:hidden flex-shrink-0">
              <NotificationBell size="sm" />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 bg-muted/30 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
