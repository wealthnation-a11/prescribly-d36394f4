import { useState } from "react";
import { Link } from "react-router-dom";
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
  Shield,
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
  color?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3, color: "text-blue-500" },
    ],
  },
  {
    title: "Users & Roles",
    items: [
      { id: "users", label: "Users", icon: Users, color: "text-violet-500" },
      { id: "roles", label: "Roles", icon: UserCog, color: "text-indigo-500" },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCard, color: "text-emerald-500" },
    ],
  },
  {
    title: "Healthcare Providers",
    items: [
      { id: "doctors", label: "Doctors", icon: Stethoscope, color: "text-cyan-500" },
      { id: "herbal", label: "Herbal Practitioners", icon: Leaf, color: "text-green-500" },
    ],
  },
  {
    title: "Content Moderation",
    items: [
      { id: "herbal-remedies", label: "Herbal Remedies", icon: Package, color: "text-amber-500" },
      { id: "herbal-articles", label: "Herbal Articles", icon: FileText, color: "text-orange-500" },
      { id: "blog", label: "Blog", icon: BookOpen, color: "text-pink-500" },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "appointments", label: "Appointments", icon: Calendar, color: "text-teal-500" },
      { id: "payments", label: "Payments", icon: DollarSign, color: "text-lime-500" },
      { id: "ai-logs", label: "AI Diagnosis", icon: Brain, color: "text-purple-500" },
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
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Admin Panel
              </h2>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex hover:bg-muted/50"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed && (
          <Link to="/" className="mt-4 block">
            <Button variant="outline" size="sm" className="w-full gap-2 hover:bg-primary/5 hover:border-primary/30 transition-colors">
              <Home className="h-4 w-4" />
              View Landing Page
            </Button>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mt-4 block">
            <Button variant="outline" size="icon" className="w-full hover:bg-primary/5 hover:border-primary/30">
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
                <h3 className="mb-2 px-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const badge = getBadgeCount(item.id);
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 relative transition-all duration-150",
                        collapsed && "justify-center px-2",
                        isActive 
                          ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm border border-primary/20" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => {
                        onSectionChange(item.id);
                        setMobileOpen(false);
                      }}
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        isActive ? "text-primary" : item.color
                      )} />
                      {!collapsed && (
                        <>
                          <span className="truncate text-sm">{item.label}</span>
                          {badge !== undefined && badge > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto h-5 min-w-5 px-1.5 text-xs animate-pulse"
                            >
                              {badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && badge !== undefined && badge > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center px-1 animate-pulse">
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

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border/50">
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              Logged in as <span className="font-medium text-foreground">Admin</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden shadow-lg bg-background/95 backdrop-blur-sm h-10 w-10"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
          "fixed inset-y-0 left-0 z-50 w-72 bg-card/95 backdrop-blur-md border-r border-border/50 shadow-2xl transform transition-transform duration-150 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-card/50 backdrop-blur-sm border-r border-border/50 sticky top-0 transition-all duration-150",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
