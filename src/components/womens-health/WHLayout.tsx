import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bell, MoreVertical, Settings, Share2, ClipboardList, Info, RefreshCw } from "lucide-react";
import { Home, CalendarDays, LineChart, User } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface Props {
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
  children: ReactNode;
}

const tabs = [
  { to: "/womens-health", icon: Home, label: "Home", end: true },
  { to: "/womens-health/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/womens-health/insights", icon: LineChart, label: "Insights" },
  { to: "/womens-health/logs", icon: ClipboardList, label: "Logs" },
  { to: "/womens-health/profile", icon: User, label: "Profile" },
];

export const WHLayout = ({ title = "Women's Health", showBack = true, rightAction, children }: Props) => {
  const navigate = useNavigate();
  const loc = useLocation();

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Prescribly — ${title}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Page link copied to clipboard." });
      }
    } catch {
      // user dismissed share dialog — ignore
    }
  };

  return (
    <div className="min-h-screen bg-wh-bg flex flex-col">
      <header className="sticky top-0 z-30 bg-wh-card/95 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-muted"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-1">
            {rightAction}
            <button
              onClick={() => navigate("/notifications")}
              className="p-2 rounded-full hover:bg-muted relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-foreground/70" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-muted" aria-label="More options">
                  <MoreVertical className="h-5 w-5 text-foreground/70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/womens-health/profile")}>
                  <Settings className="h-4 w-4 mr-2" /> Cycle & profile settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/womens-health/onboarding")}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Reset cycle dates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/notification-settings")}>
                  <Bell className="h-4 w-4 mr-2" /> Notification settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/womens-health/logs")}>
                  <ClipboardList className="h-4 w-4 mr-2" /> View all logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/support")}>
                  <Info className="h-4 w-4 mr-2" /> Help & support
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <motion.main
        key={loc.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex-1 max-w-2xl w-full mx-auto px-4 pb-28 pt-4"
      >
        {children}
      </motion.main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-wh-card/95 backdrop-blur border-t border-border/40 pb-[env(safe-area-inset-bottom)]">
        <ul className="max-w-2xl mx-auto px-2 grid grid-cols-5">
          {tabs.map(t => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                    isActive ? "text-wh-pink" : "text-muted-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <t.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                    <span className="font-medium">{t.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default WHLayout;
