import { Home, Stethoscope, FileText, Calendar, CalendarPlus, MessageCircle, User, BookOpen, Brain, HelpCircle } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { FeatureAccessGuard } from "./FeatureAccessGuard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const items = [
    { title: t("dashboard"), url: "/user-dashboard", icon: Home, requiresSubscription: false },
    { title: t("book_appointment"), url: "/book-appointment", icon: CalendarPlus, requiresSubscription: true },
    { title: "Health Companion", url: "/ai-health-companion", icon: MessageCircle, requiresSubscription: true },
    { title: "Health Diagnostic", url: "/health-diagnostic", icon: Brain, requiresSubscription: true },
    { title: t("my_prescriptions"), url: "/my-prescriptions", icon: FileText, requiresSubscription: true },
    { title: t("chat"), url: "/chat", icon: MessageCircle, requiresSubscription: true },
    { title: t("profile"), url: "/profile", icon: User, requiresSubscription: false },
    { title: "Support", url: "/support", icon: HelpCircle, requiresSubscription: false },
  ];

  const isActive = (path: string) => currentPath === path;
  const isExpanded = items.some((i) => isActive(i.url));
  const isCollapsed = state === "collapsed";
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground";

  // Close mobile sidebar on navigation
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar
      className={`border-r border-border transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}
      collapsible="icon"
    >
      <SidebarContent className="bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <NavLink to="/" end className="flex items-center gap-3" aria-label="Go to home">
            <Logo size="sm" />
            {!isCollapsed && (
              <div className="flex-1">
                <h2 className="font-bold text-lg text-sidebar-foreground">Prescribly</h2>
                <p className="text-xs text-sidebar-foreground/70">Health Platform</p>
              </div>
            )}
          </NavLink>
          {!isCollapsed && (
            <div className="mt-3 flex justify-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          )}
          {isCollapsed && (
            <div className="mt-2 space-y-2 flex flex-col items-center">
              <NotificationBell size="sm" />
              <ThemeToggle size="sm" />
            </div>
          )}
        </div>

        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className={`px-4 mb-2 ${isCollapsed ? "sr-only" : ""}`}>
            Main Menu
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    {item.requiresSubscription ? (
                      <FeatureAccessGuard featureName={item.title}>
                        <NavLink 
                          to={item.url} 
                          end 
                          onClick={handleNavClick}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full
                            ${getNavCls({ isActive })}
                          `}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!isCollapsed && (
                            <span className="text-content font-medium">{item.title}</span>
                          )}
                        </NavLink>
                      </FeatureAccessGuard>
                    ) : (
                      <NavLink 
                        to={item.url} 
                        end 
                        onClick={handleNavClick}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                          ${getNavCls({ isActive })}
                        `}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="text-content font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}