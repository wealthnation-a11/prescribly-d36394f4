import { Calendar, Users, FileText, MessageCircle, User, Clock, TrendingUp, Stethoscope, LogOut } from "lucide-react";
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
  { title: "Dashboard", url: "/doctor-dashboard", icon: Stethoscope, hoverColor: "hover:bg-blue-700" },
  { title: "Today's Appointments", url: "/doctor/appointments", icon: Calendar, hoverColor: "hover:bg-blue-700" },
  { title: "My Patients", url: "/doctor/patients", icon: Users, hoverColor: "hover:bg-blue-700" },
  { title: "Write Prescription", url: "/doctor/prescriptions", icon: FileText, hoverColor: "hover:bg-green-700" },
  { title: "Patient Messages", url: "/doctor/messages", icon: MessageCircle, hoverColor: "hover:bg-purple-700" },
  { title: "My Profile", url: "/doctor/profile", icon: User, hoverColor: "hover:bg-gray-700" },
  { title: "Availability", url: "/doctor/availability", icon: Clock, hoverColor: "hover:bg-orange-700" },
  { title: "Earnings", url: "/doctor/earnings", icon: TrendingUp, hoverColor: "hover:bg-teal-700" },
];

export function DoctorSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { isApproved } = useDoctorApproval();
  const { handleLogout } = useLogout();

  const visibleItems = isApproved ? items : items.filter((i) => i.title === "My Profile");

  const isActive = (path: string) => currentPath === path;
  const isExpanded = items.some((i) => isActive(i.url));
  const isCollapsed = state === "collapsed";
  
  const getNavCls = ({ isActive }: { isActive: boolean }, hoverColor: string) =>
    isActive 
      ? "bg-white/10 text-white font-medium border-r-4 border-white" 
      : `text-gray-300 hover:text-white transition-all duration-200 ${hoverColor}`;

  return (
    <Sidebar className={`bg-gray-900 text-white rounded-r-2xl shadow-lg h-screen flex flex-col justify-between transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}>
      <SidebarContent className="bg-gray-900 text-white flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <NavLink to="/" end className="flex items-center gap-3" aria-label="Go to home">
            <Logo size="sm" />
            {!isCollapsed && (
              <div className="flex-1">
                <h2 className="font-bold text-lg text-white">Prescribly</h2>
                <p className="text-xs text-gray-300">Doctor Portal</p>
              </div>
            )}
          </NavLink>
          {!isCollapsed && (
            <div className="mt-3 flex justify-center gap-2">
              <NotificationBell variant="outline" className="border-gray-600 text-white hover:bg-gray-800" />
              <ThemeToggle variant="outline" className="border-gray-600 text-white hover:bg-gray-800" />
            </div>
          )}
          {isCollapsed && (
            <div className="mt-2 space-y-2 flex flex-col items-center">
              <NotificationBell variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-800" />
              <ThemeToggle variant="outline" size="sm" className="border-gray-600 text-white hover:bg-gray-800" />
            </div>
          )}
        </div>

        {/* Menu Items */}
        <SidebarGroup className="flex-1 px-2 py-4">
          <SidebarGroupLabel className={`px-4 mb-2 text-gray-400 ${isCollapsed ? "sr-only" : ""}`}>
            Doctor Menu
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
        <div className="p-4 border-t border-gray-700">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg p-2 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {!isCollapsed && "Logout"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}