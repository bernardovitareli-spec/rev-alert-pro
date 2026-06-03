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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Pular para o conteúdo principal
      </a>
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
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto p-6 focus:outline-none">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
