import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin } from 'lucide-react';

interface DoctorCardProps {
  name: string;
  specialization: string;
  avatarUrl?: string | null;
  rating?: number | null;
  price: number | null;
  priceLabel?: string;
  distanceMiles?: number;
  onSelect: () => void;
  buttonText?: string;
}

export const DoctorCard = ({
  name,
  specialization,
  avatarUrl,
  rating,
  price,
  priceLabel = 'Consultation Fee',
  distanceMiles,
  onSelect,
  buttonText = 'Select Doctor',
}: DoctorCardProps) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card className="border border-border/50 hover:border-primary/30 transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
            <p className="text-sm text-muted-foreground">{specialization}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {rating != null && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{rating.toFixed(1)}</span>
                </div>
              )}
              {distanceMiles != null && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-xs">{distanceMiles.toFixed(1)} mi</span>
                </div>
              )}
              {price != null && (
                <Badge variant="secondary" className="text-xs">
                  {priceLabel}: ₦{price.toLocaleString()}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button onClick={onSelect} className="w-full mt-4" size="sm">
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};
