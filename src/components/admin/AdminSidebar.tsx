import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shield,
  CreditCard,
  Stethoscope,
  Calendar,
  DollarSign,
  Brain,
} from "lucide-react";
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

const menuItems = [
  { title: "Analytics", url: "/admin-dashboard", icon: LayoutDashboard, exact: true },
  { title: "Users", url: "/admin-dashboard/users", icon: Users },
  { title: "Roles", url: "/admin-dashboard/roles", icon: Shield },
  { title: "Subscriptions", url: "/admin-dashboard/subscriptions", icon: CreditCard },
  { title: "Doctors", url: "/admin-dashboard/doctors", icon: Stethoscope },
  { title: "Appointments", url: "/admin-dashboard/appointments", icon: Calendar },
  { title: "Payments", url: "/admin-dashboard/payments", icon: DollarSign },
  { title: "AI Diagnosis", url: "/admin-dashboard/ai-diagnosis", icon: Brain },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (item: typeof menuItems[0]) => {
    if (item.exact) {
      return currentPath === item.url;
    }
    return currentPath.startsWith(item.url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} end={item.exact}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
