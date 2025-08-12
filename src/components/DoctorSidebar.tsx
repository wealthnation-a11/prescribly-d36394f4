import { Calendar, Users, FileText, MessageCircle, User, Clock, TrendingUp, Stethoscope } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useDoctorApproval } from "@/hooks/useDoctorApproval";
import { Logo } from "./Logo";
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

const items = [
  { title: "Dashboard", url: "/doctor-dashboard", icon: Stethoscope },
  { title: "Today's Appointments", url: "/doctor/appointments", icon: Calendar },
  { title: "My Patients", url: "/doctor/patients", icon: Users },
  { title: "Write Prescription", url: "/doctor/prescriptions", icon: FileText },
  { title: "Patient Messages", url: "/doctor/messages", icon: MessageCircle },
  { title: "My Profile", url: "/doctor/profile", icon: User },
  { title: "Availability", url: "/doctor/availability", icon: Clock },
  { title: "Earnings", url: "/doctor/earnings", icon: TrendingUp },
];

export function DoctorSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { isApproved } = useDoctorApproval();

  const visibleItems = isApproved ? items : items.filter((i) => i.title === "My Profile");

  const isActive = (path: string) => currentPath === path;
  const isExpanded = items.some((i) => isActive(i.url));
  const isCollapsed = state === "collapsed";
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar
      className={`border-r border-border transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}
    >
      <SidebarContent className="bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <NavLink to="/" end className="flex items-center gap-3" aria-label="Go to home">
            <Logo size="sm" />
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-lg text-sidebar-foreground">Prescribly</h2>
                <p className="text-xs text-sidebar-foreground/70">Doctor Portal</p>
              </div>
            )}
          </NavLink>
        </div>

        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className={`px-4 mb-2 ${isCollapsed ? "sr-only" : ""}`}>
            Doctor Menu
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink 
                      to={item.url} 
                      end 
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