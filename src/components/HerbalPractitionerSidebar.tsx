import { Home, Leaf, FileText, Calendar, MessageSquare, DollarSign, User, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { useLogout } from '@/hooks/useLogout';
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
  SidebarFooter,
} from '@/components/ui/sidebar';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/herbal-dashboard' },
  { icon: User, label: 'Profile', path: '/herbal-profile' },
  { icon: Leaf, label: 'Remedies', path: '/herbal-remedies' },
  { icon: FileText, label: 'Articles', path: '/herbal-articles' },
  { icon: Calendar, label: 'Consultations', path: '/herbal-consultations' },
  { icon: MessageSquare, label: 'Messages', path: '/herbal-messages' },
  { icon: DollarSign, label: 'Earnings', path: '/herbal-earnings' },
];

export const HerbalPractitionerSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogout } = useLogout();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/40 p-4">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Herbal Practitioner Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={location.pathname === item.path}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
