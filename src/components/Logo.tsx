import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/prescriblycare-header-logo.png.asset.json";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withLink?: boolean;
  className?: string;
  priority?: boolean;
  compact?: boolean;
}

export const Logo = ({ size = "md", withLink = false, className, priority = false, compact = false }: LogoProps) => {
  const heightCls = size === "sm" ? "h-10" : size === "lg" ? "h-24" : "h-14";
  const Img = (
    <img
      src={compact ? "/favicon.png" : logoAsset.url}
      alt="PrescriblyCare logo"
      width={compact ? 64 : 408}
      height={compact ? 64 : 220}
      className={cn("w-auto max-w-full object-contain shrink-0 rounded bg-background", compact ? "h-8 w-8" : heightCls, className)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );

  if (withLink) {
    return (
      <Link to="/" aria-label="PrescriblyCare home" className="flex items-center shrink-0 max-w-full">
        {Img}
      </Link>
    );
  }

  return Img;
};
