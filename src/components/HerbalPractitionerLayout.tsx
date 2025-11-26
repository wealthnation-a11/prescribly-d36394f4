import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HerbalPractitionerSidebar } from './HerbalPractitionerSidebar';
import { MobileHeader } from './MobileHeader';

interface HerbalPractitionerLayoutProps {
  children: ReactNode;
}

export const HerbalPractitionerLayout = ({ children }: HerbalPractitionerLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <HerbalPractitionerSidebar />
        <main className="flex-1 flex flex-col w-full">
          <MobileHeader title="Herbal Practitioner Portal" />
          <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
