import { Leaf, FileText, Calendar, MessageSquare, DollarSign, User, LogOut, Home } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useHerbalPractitioner } from '@/hooks/useHerbalPractitioner';
import { useLogout } from '@/hooks/useLogout';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/sidebar';

const items = [
  { title: "Dashboard", url: "/herbal-dashboard", icon: Home, hoverColor: "hover:bg-green-700" },
  { title: "My Remedies", url: "/herbal-remedies", icon: Leaf, hoverColor: "hover:bg-emerald-700" },
  { title: "My Articles", url: "/herbal-articles", icon: FileText, hoverColor: "hover:bg-teal-700" },
  { title: "Consultations", url: "/herbal-consultations", icon: Calendar, hoverColor: "hover:bg-green-700" },
  { title: "Messages", url: "/herbal-messages", icon: MessageSquare, hoverColor: "hover:bg-purple-700" },
  { title: "My Profile", url: "/herbal-profile", icon: User, hoverColor: "hover:bg-gray-700" },
  { title: "Earnings", url: "/herbal-earnings", icon: DollarSign, hoverColor: "hover:bg-amber-700" },
];

export function HerbalPractitionerSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { isApproved } = useHerbalPractitioner();
  const { handleLogout } = useLogout();

  const visibleItems = isApproved ? items : items.filter((i) => i.title === "My Profile");

  const isActive = (path: string) => currentPath === path;
  const isExpanded = items.some((i) => isActive(i.url));
  const isCollapsed = state === "collapsed";
  
  const getNavCls = ({ isActive }: { isActive: boolean }, hoverColor: string) =>
    isActive 
      ? "bg-primary/20 text-primary font-medium border-r-4 border-primary" 
      : `text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200`;

  return (
    <Sidebar className={`bg-sidebar border-r shadow-lg h-screen flex flex-col justify-between transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}>
      <SidebarContent className="bg-transparent flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <NavLink to="/" end className="flex items-center gap-3" aria-label="Go to home">
            <Logo size="sm" />
            {!isCollapsed && (
              <div className="flex-1">
                <h2 className="font-bold text-lg text-sidebar-foreground">Prescribly</h2>
                <p className="text-xs text-muted-foreground">Herbal Portal</p>
              </div>
            )}
          </NavLink>
          {!isCollapsed && (
            <div className="mt-3 flex justify-center gap-2">
              <NotificationBell variant="outline" className="border-border hover:bg-sidebar-accent" />
              <ThemeToggle variant="outline" className="border-border hover:bg-sidebar-accent" />
            </div>
          )}
          {isCollapsed && (
            <div className="mt-2 space-y-2 flex flex-col items-center">
              <NotificationBell variant="outline" size="sm" className="border-border hover:bg-sidebar-accent" />
              <ThemeToggle variant="outline" size="sm" className="border-border hover:bg-sidebar-accent" />
            </div>
          )}
        </div>

        {/* Menu Items */}
        <SidebarGroup className="flex-1 px-2 py-4">
          <SidebarGroupLabel className={`px-4 mb-2 text-muted-foreground ${isCollapsed ? "sr-only" : ""}`}>
            Practitioner Menu
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                        ${getNavCls({ isActive }, item.hoverColor)}
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg p-2 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {!isCollapsed && "Logout"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
