import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/prescriblycare-logo-light.png.asset.json";
import logoDark from "@/assets/prescriblycare-logo-dark.png.asset.json";
import iconAsset from "@/assets/prescriblycare-icon.png.asset.json";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withLink?: boolean;
  className?: string;
  priority?: boolean;
  compact?: boolean;
  /** Use on dark backgrounds (white wordmark). */
  onDark?: boolean;
}

export const Logo = ({
  size = "md",
  withLink = false,
  className,
  priority = false,
  compact = false,
  onDark = false,
}: LogoProps) => {
  const heightCls = size === "sm" ? "h-10" : size === "lg" ? "h-24" : "h-14";
  const src = compact ? iconAsset.url : onDark ? logoDark.url : logoLight.url;
  const Img = (
    <img
      src={src}
      alt="PrescriblyCare logo"
      width={compact ? 64 : 449}
      height={compact ? 64 : 289}
      className={cn("w-auto max-w-full object-contain shrink-0", compact ? "h-9 w-9" : heightCls, className)}
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
