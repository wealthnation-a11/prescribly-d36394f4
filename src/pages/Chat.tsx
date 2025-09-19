import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import DoctorMessaging from '@/components/messaging/DoctorMessaging';
import PatientMessaging from '@/components/messaging/PatientMessaging';
import { Card, CardContent } from '@/components/ui/card';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';

export default function Chat() {
  const { userProfile } = useAuth();

  const renderMessagingComponent = () => {
    if (!userProfile) {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
            <span>Loading your messages...</span>
          </CardContent>
        </Card>
      );
    }

    if (userProfile.role === 'doctor') {
      return <DoctorMessaging />;
    } else if (userProfile.role === 'patient') {
      return <PatientMessaging />;
    } else {
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Invalid user role for messaging.</p>
          </CardContent>
        </Card>
      );
    }
  };

  return (
    <SubscriptionGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="p-6">
              {renderMessagingComponent()}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </SubscriptionGuard>
  );
}