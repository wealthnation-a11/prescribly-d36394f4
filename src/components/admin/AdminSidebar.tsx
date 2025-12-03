import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  UserCog,
  CreditCard,
  Stethoscope,
  Leaf,
  Package,
  FileText,
  Calendar,
  DollarSign,
  Brain,
  BookOpen,
  Home,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  pendingCounts?: {
    doctors?: number;
    herbalPractitioners?: number;
    herbalRemedies?: number;
    herbalArticles?: number;
  };
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Users & Roles",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "roles", label: "Roles", icon: UserCog },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    title: "Healthcare Providers",
    items: [
      { id: "doctors", label: "Doctors", icon: Stethoscope },
      { id: "herbal", label: "Herbal Practitioners", icon: Leaf },
    ],
  },
  {
    title: "Content Moderation",
    items: [
      { id: "herbal-remedies", label: "Herbal Remedies", icon: Package },
      { id: "herbal-articles", label: "Herbal Articles", icon: FileText },
      { id: "blog", label: "Blog", icon: BookOpen },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "appointments", label: "Appointments", icon: Calendar },
      { id: "payments", label: "Payments", icon: DollarSign },
      { id: "ai-logs", label: "AI Diagnosis", icon: Brain },
    ],
  },
];

export function AdminSidebar({
  activeSection,
  onSectionChange,
  pendingCounts = {},
}: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getBadgeCount = (id: string) => {
    switch (id) {
      case "doctors":
        return pendingCounts.doctors;
      case "herbal":
        return pendingCounts.herbalPractitioners;
      case "herbal-remedies":
        return pendingCounts.herbalRemedies;
      case "herbal-articles":
        return pendingCounts.herbalArticles;
      default:
        return undefined;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed && (
          <Link to="/" className="mt-3 block">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Home className="h-4 w-4" />
              View Landing Page
            </Button>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mt-3 block">
            <Button variant="outline" size="icon" className="w-full">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const badge = getBadgeCount(item.id);
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={activeSection === item.id ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 relative",
                        collapsed && "justify-center px-2",
                        activeSection === item.id && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                      onClick={() => {
                        onSectionChange(item.id);
                        setMobileOpen(false);
                      }}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {badge !== undefined && badge > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                            >
                              {badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && badge !== undefined && badge > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">
                          {badge}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-150 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-card border-r border-border sticky top-0 transition-all duration-150",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
