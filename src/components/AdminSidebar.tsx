import { Users, UserCheck, BarChart3, Settings, Bell, FileText, Calendar, DollarSign, Activity, LogOut, Shield } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
import { useLogout } from "@/hooks/useLogout";
import { Logo } from "./Logo";

const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/admin-dashboard",
    icon: BarChart3,
    hoverColor: "hover:bg-primary/10 hover:text-primary",
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    hoverColor: "hover:bg-blue-50 hover:text-blue-700",
  },
  {
    title: "Doctor Approval",
    url: "/admin/doctors",
    icon: UserCheck,
    hoverColor: "hover:bg-green-50 hover:text-green-700",
  },
  {
    title: "Appointments",
    url: "/admin/appointments",
    icon: Calendar,
    hoverColor: "hover:bg-purple-50 hover:text-purple-700",
  },
  {
    title: "Financial Reports",
    url: "/admin/finance",
    icon: DollarSign,
    hoverColor: "hover:bg-emerald-50 hover:text-emerald-700",
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: Activity,
    hoverColor: "hover:bg-orange-50 hover:text-orange-700",
  },
  {
    title: "Notifications",
    url: "/admin/notifications",
    icon: Bell,
    hoverColor: "hover:bg-yellow-50 hover:text-yellow-700",
  },
  {
    title: "Content Management",
    url: "/admin/content",
    icon: FileText,
    hoverColor: "hover:bg-indigo-50 hover:text-indigo-700",
  },
  {
    title: "System Settings",
    url: "/admin/settings",
    icon: Settings,
    hoverColor: "hover:bg-slate-50 hover:text-slate-700",
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { handleLogout } = useLogout();

  const isActive = (path: string) => location.pathname === path;

  const getNavClassName = (item: any) => {
    const baseClasses = "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors";
    const activeClasses = isActive(item.url)
      ? "bg-primary text-primary-foreground font-medium"
      : `text-muted-foreground ${item.hoverColor}`;
    return `${baseClasses} ${activeClasses}`;
  };

  return (
    <Sidebar className={`border-r bg-background ${collapsed ? "w-14" : "w-64"}`} collapsible="icon">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-lg text-foreground">Admin Portal</h2>
                <p className="text-xs text-muted-foreground">Prescribly Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={getNavClassName(item)}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="mt-auto p-4 border-t">
          <SidebarMenuButton
            onClick={handleLogout}
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}