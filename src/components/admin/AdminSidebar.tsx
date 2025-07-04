import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  ScrollText,
  Settings,
  LogOut,
  Stethoscope
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Doctors', url: '/admin/doctors', icon: UserCheck },
  { title: 'Appointments', url: '/admin/appointments', icon: Calendar },
  { title: 'Prescriptions', url: '/admin/prescriptions', icon: FileText },
  { title: 'Transactions', url: '/admin/transactions', icon: CreditCard },
  { title: 'Support Tickets', url: '/admin/support', icon: MessageSquare },
  { title: 'System Logs', url: '/admin/logs', icon: ScrollText },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="bg-slate-900 text-white border-r border-slate-800">
      <SidebarHeader className="border-b border-slate-800 p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold">Prescribly Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 text-xs uppercase tracking-wider px-4 py-2">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url}
                    className="text-slate-300 hover:text-white hover:bg-slate-800 data-[active=true]:bg-primary data-[active=true]:text-white"
                  >
                    <a href={item.url} className="flex items-center gap-3 px-4 py-2">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-slate-800" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 flex items-center gap-3 px-4 py-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};