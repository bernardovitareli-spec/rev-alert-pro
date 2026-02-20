import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/40 bg-card/80 backdrop-blur-sm px-6">
          <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors" />
          {title && (
            <div className="flex items-center gap-2">
              <div className="h-5 w-0.5 rounded-full bg-primary/40" />
              <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
