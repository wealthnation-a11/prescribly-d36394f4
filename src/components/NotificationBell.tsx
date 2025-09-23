import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default";
  showCount?: boolean;
}

export const NotificationBell = ({ 
  className, 
  size = "default", 
  variant = "ghost",
  showCount = true 
}: NotificationBellProps) => {
  const navigate = useNavigate();
  const { unreadCount, loading } = useNotificationCount();

  const handleClick = () => {
    // For now, navigate to user dashboard where notifications are shown
    // You could also create a dedicated notifications page or modal
    navigate('/user-dashboard');
  };

  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const buttonSizes = {
    sm: "h-8 w-8",
    default: "h-9 w-9", 
    lg: "h-10 w-10"
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn(
        "relative",
        buttonSizes[size],
        "p-0",
        className
      )}
      onClick={handleClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className={iconSizes[size]} />
      
      {/* Notification count badge */}
      {showCount && !loading && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem] animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* Pulse animation for new notifications */}
      {!loading && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-ping opacity-75" />
      )}
    </Button>
  );
};