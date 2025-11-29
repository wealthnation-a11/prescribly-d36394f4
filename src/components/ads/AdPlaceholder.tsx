import { Skeleton } from '@/components/ui/skeleton';

interface AdPlaceholderProps {
  height?: string;
  className?: string;
}

export const AdPlaceholder = ({ height = "250px", className = "" }: AdPlaceholderProps) => {
  return (
    <div className={`w-full bg-muted/30 rounded-lg border border-border/50 flex items-center justify-center ${className}`} style={{ height }}>
      <Skeleton className="w-full h-full" />
    </div>
  );
};
