import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Phone } from 'lucide-react';

interface FacilityCardProps {
  name: string;
  type: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  distanceMiles?: number;
  onSelect: () => void;
}

export const FacilityCard = ({
  name,
  type,
  address,
  city,
  phone,
  description,
  logoUrl,
  distanceMiles,
  onSelect,
}: FacilityCardProps) => {
  const typeColor = {
    hospital: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    clinic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pharmacy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  }[type] || 'bg-muted text-muted-foreground';

  return (
    <Card className="border border-border/50 hover:border-primary/30 transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              <Badge className={`text-[10px] ${typeColor}`}>{type}</Badge>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {(address || city) && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{city || address}</span>
                </div>
              )}
              {distanceMiles != null && (
                <span className="font-medium text-primary">{distanceMiles.toFixed(1)} mi away</span>
              )}
              {phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button onClick={onSelect} className="w-full mt-4" size="sm">
          Select & Get Code
        </Button>
      </CardContent>
    </Card>
  );
};
