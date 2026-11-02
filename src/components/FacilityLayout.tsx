import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FacilitySidebar } from "@/components/FacilitySidebar";
import { Logo } from "@/components/Logo";

export function FacilityLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <FacilitySidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border/30 bg-background/80 backdrop-blur-sm px-4">
            <SidebarTrigger />
            <Logo compact withLink className="ml-3" />
            <span className="ml-3 text-sm font-medium text-muted-foreground">Facility Portal</span>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
