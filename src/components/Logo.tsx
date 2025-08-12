import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withLink?: boolean;
  className?: string;
  priority?: boolean;
}

export const Logo = ({ size = "md", withLink = false, className, priority = false }: LogoProps) => {
  const heightCls = size === "sm" ? "h-6" : size === "lg" ? "h-10" : "h-8";
  const Img = (
    <img
      src="/lovable-uploads/7675acdf-8e5e-4c27-a892-23a63e6023f6.png"
      alt="Prescribly logo"
      width={236}
      height={286}
      className={cn("w-auto", heightCls, className)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );

  if (withLink) {
    return (
      <Link to="/" aria-label="Go to home" className="flex items-center">
        {Img}
      </Link>
    );
  }

  return Img;
};
