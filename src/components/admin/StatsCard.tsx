import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: boolean;
}

export const StatsCard = ({ title, value, subtitle, icon: Icon, gradient }: StatsCardProps) => {
  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div 
            className={`
              p-3 rounded-xl
              ${gradient 
                ? 'bg-gradient-to-br from-[hsl(var(--admin-gradient-start))] to-[hsl(var(--admin-gradient-end))]' 
                : 'bg-gray-100'
              }
            `}
          >
            <Icon className={`h-6 w-6 ${gradient ? 'text-white' : 'text-gray-600'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
