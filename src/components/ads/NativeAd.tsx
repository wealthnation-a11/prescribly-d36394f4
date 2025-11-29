import { useEffect, useState } from 'react';
import { useAdContext } from './AdProvider';
import { AdPlaceholder } from './AdPlaceholder';

interface NativeAdProps {
  className?: string;
}

export const NativeAd = ({ className = "" }: NativeAdProps) => {
  const { isInitialized, isNative } = useAdContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitialized && isNative) {
      // Native ads are loaded programmatically
      const timer = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, isNative]);

  if (!isNative) return null;

  if (isLoading) {
    return <AdPlaceholder height="300px" className={className} />;
  }

  return (
    <div className={`w-full bg-muted/20 rounded-lg border border-border p-4 ${className}`}>
      <div className="text-xs text-muted-foreground mb-2">Sponsored</div>
      <div className="space-y-2">
        <div className="h-40 bg-muted rounded" />
        <div className="text-sm font-medium">Native Ad Content</div>
        <div className="text-xs text-muted-foreground">Ad description here</div>
      </div>
    </div>
  );
};
