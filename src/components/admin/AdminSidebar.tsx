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
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/admin-dashboard", icon: LayoutDashboard, exact: true },
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
    <Sidebar collapsible="icon" className="bg-[#2d2d3a] border-r-0">
      <SidebarHeader className="border-b border-white/10 p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--admin-gradient-start))] to-[hsl(var(--admin-gradient-end))] flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          {open && <span className="text-white font-semibold text-lg">Prescribly</span>}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-[#2d2d3a]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 uppercase text-xs px-3">
            {open ? "Admin Panel" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={active}
                      className={`
                        ${active 
                          ? 'bg-gradient-to-r from-[hsl(var(--admin-gradient-start))] to-[hsl(var(--admin-gradient-end))] text-white' 
                          : 'text-gray-300 hover:bg-white/5'
                        }
                        transition-all duration-200
                      `}
                    >
                      <NavLink to={item.url} end={item.exact}>
                        <item.icon className="h-5 w-5" />
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
