import { Calendar, Users, FileText, MessageCircle, User, Clock, TrendingUp, Stethoscope, LogOut, Home } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useDoctorApproval } from "@/hooks/useDoctorApproval";
import { useLogout } from "@/hooks/useLogout";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
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
  { title: "Home Visits", url: "/doctor/home-visits", icon: Home },
  { title: "Availability", url: "/doctor/availability", icon: Clock },
  { title: "Earnings", url: "/doctor/earnings", icon: TrendingUp },
];

export function DoctorSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { isApproved } = useDoctorApproval();
  const { handleLogout } = useLogout();

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r-0"
    >
      <SidebarContent className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <NavLink to="/" end className="flex items-center gap-3" aria-label="Go to home">
            <Logo size="sm" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg text-white truncate">Prescribly</h2>
                <p className="text-xs text-slate-400">Doctor Portal</p>
              </div>
            )}
          </NavLink>
          {!isCollapsed && (
            <div className="mt-3 flex justify-center gap-2">
              <NotificationBell variant="outline" className="border-white/20 text-white hover:bg-white/10" />
              <ThemeToggle variant="outline" className="border-white/20 text-white hover:bg-white/10" />
            </div>
          )}
        </div>

        {/* Menu Items */}
        <SidebarGroup className="flex-1 px-2 py-3">
          <SidebarGroupLabel className={`px-3 mb-1 text-slate-500 uppercase text-[11px] tracking-wider font-semibold ${isCollapsed ? "sr-only" : ""}`}>
            Menu
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => {
                const active = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-11">
                      <NavLink
                        to={item.url}
                        end
                        onClick={() => setOpenMobile(false)}
                        className={() => `
                          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                          ${active
                            ? "bg-primary/20 text-white font-medium shadow-sm shadow-primary/10"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                          }
                        `}
                      >
                        <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-primary" : ""}`} />
                        {!isCollapsed && (
                          <span className="text-sm">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="p-3 border-t border-white/10">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg h-11"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
