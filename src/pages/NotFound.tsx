import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="mb-8">
        <Logo size="lg" withLink />
      </div>
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary hover:text-primary/80 underline font-medium transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
