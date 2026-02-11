import { 
  LayoutDashboard, 
  Upload, 
  Settings, 
  LogOut,
  Wrench,
  Building2,
  Calendar,
  FileBarChart,
  Truck
} from 'lucide-react';
import logoMC from '@/assets/logo-mc.png';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarStats } from '@/hooks/useSidebarStats';
import { MenuBadge } from '@/components/ui/menu-badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const stats = useSidebarStats();

  const menuItems = [
    { 
      title: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/',
      tooltip: 'Visão geral da frota e alertas',
      badge: null,
    },
    { 
      title: 'Veículos', 
      icon: Truck, 
      path: '/veiculos',
      tooltip: 'Gerenciar veículos e revisões',
      badge: stats.veiculosCriticos > 0 ? { count: stats.veiculosCriticos, variant: 'critical' as const } : null,
    },
    { 
      title: 'Calendário', 
      icon: Calendar, 
      path: '/calendario',
      tooltip: 'Visualizar agenda de revisões',
      badge: stats.revisoesHoje > 0 ? { count: stats.revisoesHoje, variant: 'warning' as const } : null,
    },
    { 
      title: 'Relatórios', 
      icon: FileBarChart, 
      path: '/relatorios',
      tooltip: 'Análises e gastos da frota',
      badge: null,
    },
    { 
      title: 'Importar Dados', 
      icon: Upload, 
      path: '/importar',
      tooltip: 'Importar planilhas Excel',
      badge: null,
    },
  ];

  const configItems = [
    { 
      title: 'Tipos de Revisão', 
      icon: Wrench, 
      path: '/tipos-revisao',
      tooltip: 'Configurar tipos de manutenção',
    },
    { 
      title: 'Empresas', 
      icon: Building2, 
      path: '/empresas',
      tooltip: 'Gerenciar empresas contratantes',
    },
    { 
      title: 'Oficinas', 
      icon: Settings, 
      path: '/oficinas',
      tooltip: 'Cadastrar oficinas parceiras',
    },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border shadow-sm">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex flex-col items-center justify-center w-full">
          <img 
            src={logoMC} 
            alt="MC Terraplenagem" 
            className="w-full h-auto object-contain scale-125"
          />
          <span className="text-base font-semibold text-sidebar-foreground -mt-3">
            Controle de Revisões
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === item.path}
                        className="transition-all duration-200 hover:translate-x-1"
                      >
                        <Link to={item.path} className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </span>
                          {item.badge && (
                            <MenuBadge 
                              count={item.badge.count} 
                              variant={item.badge.variant}
                            />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === item.path}
                        className="transition-all duration-200 hover:translate-x-1"
                      >
                        <Link to={item.path}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-sidebar-foreground/80 truncate">
            {user?.email}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
