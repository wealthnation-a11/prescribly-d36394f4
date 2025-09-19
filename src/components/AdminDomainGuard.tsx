import { ReactNode, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle } from "lucide-react";

interface AdminDomainGuardProps {
  children: ReactNode;
}

export function AdminDomainGuard({ children }: AdminDomainGuardProps) {
  const [isAuthorizedDomain, setIsAuthorizedDomain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDomain = () => {
      const currentDomain = window.location.hostname;
      const allowedDomains = [
        'presscriblyadmin.lovable.app',
        'localhost', // For development
        '127.0.0.1' // For development
      ];
      
      const isAllowed = allowedDomains.some(domain => 
        currentDomain === domain || currentDomain.includes('lovable.app')
      );
      
      setIsAuthorizedDomain(isAllowed);
      setIsLoading(false);
    };

    checkDomain();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorizedDomain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Admin access is restricted to authorized domains only
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              This admin portal can only be accessed from:
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <code className="text-sm">presscriblyadmin.lovable.app</code>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Please use the correct domain to access the admin portal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}