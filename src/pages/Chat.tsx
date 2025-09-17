import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import ChatAndCall from '@/components/ChatAndCall';

export default function Chat() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="p-6">
            <ChatAndCall />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}