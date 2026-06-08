import { 
  LayoutDashboard, 
  Upload, 
  Settings, 
  LogOut,
  Wrench,
  ClipboardList,
  Building2,
  Calendar,
  FileBarChart,
  Truck,
  ChevronRight,
  Users,
  Download,
  SlidersHorizontal,
  UserCircle
} from 'lucide-react';
import logoMC from '@/assets/logo-mc-20anos.jpg';
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
import { useUserRole } from '@/hooks/useUserRole';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const stats = useSidebarStats();
  const { isAdmin, isApontador } = useUserRole();

  const veiculosItem = {
    title: 'Veículos',
    icon: Truck,
    path: '/veiculos',
    tooltip: isApontador ? 'Atualizar Km/Hr dos veículos' : 'Gerenciar veículos e revisões',
    badge:
      !isApontador && stats.veiculosCriticos > 0
        ? { count: stats.veiculosCriticos, variant: 'critical' as const }
        : null,
  };

  const menuItems = isApontador
    ? [veiculosItem]
    : [
        {
          title: 'Dashboard',
          icon: LayoutDashboard,
          path: '/',
          tooltip: 'Visão geral da frota e alertas',
          badge: null,
        },
        veiculosItem,
        {
          title: 'Calendário',
          icon: Calendar,
          path: '/calendario',
          tooltip: 'Visualizar agenda de revisões',
          badge: stats.revisoesHoje > 0 ? { count: stats.revisoesHoje, variant: 'warning' as const } : null,
        },
        {
          title: 'Controle Entrada/Saída',
          icon: ClipboardList,
          path: '/controle-entrada-saida',
          tooltip: 'Registrar entrada e saída de equipamentos',
          badge: null,
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

  const configItems = isApontador
    ? []
    : [
        { title: 'Tipos de Revisão', icon: Wrench, path: '/tipos-revisao', tooltip: 'Configurar tipos de manutenção' },
        { title: 'Empresas', icon: Building2, path: '/empresas', tooltip: 'Gerenciar empresas contratantes' },
        { title: 'Mecânicos', icon: Settings, path: '/oficinas', tooltip: 'Cadastrar mecânicos parceiros' },
        { title: 'Configurações', icon: SlidersHorizontal, path: '/configuracoes', tooltip: 'Preferências do usuário e conta' },
        ...(isAdmin
          ? [
              { title: 'Usuários', icon: Users, path: '/admin/usuarios', tooltip: 'Gerenciar usuários e convites' },
              { title: 'Exportar Dados', icon: Download, path: '/admin/exportar-ordens', tooltip: 'Baixar CSV de ordens de serviço' },
            ]
          : []),
      ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/50 px-4 py-5">
        <div className="flex flex-col items-center justify-center w-full gap-1">
          <img 
            src={logoMC} 
            alt="MC Terraplenagem" 
            className="w-full h-auto object-contain"
            style={{ filter: 'brightness(1.05) contrast(1.05)' }}
          />
          <div className="flex items-center gap-1.5 mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary opacity-80" />
            <span className="text-xs font-medium text-sidebar-foreground/50 tracking-widest uppercase">
              {isApontador ? 'Modo Apontador' : 'Controle de Revisões'}
            </span>
            <div className="h-1.5 w-1.5 rounded-full bg-primary opacity-80" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 px-3 mb-1">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        asChild
                        isActive={isActive(item.path)}
                        className={`
                          relative h-10 rounded-lg transition-all duration-200
                          text-sidebar-foreground/60 hover:text-sidebar-foreground
                          hover:bg-sidebar-accent/60
                          data-[active=true]:bg-primary/12
                          data-[active=true]:text-primary
                          data-[active=true]:font-medium
                        `}
                      >
                        <Link to={item.path} className="flex items-center justify-between w-full px-3">
                          <span className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="text-sm">{item.title}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {item.badge && (
                              <MenuBadge 
                                count={item.badge.count} 
                                variant={item.badge.variant}
                              />
                            )}
                            {isActive(item.path) && (
                              <ChevronRight className="h-3 w-3 text-primary opacity-70" />
                            )}
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.tooltip}
                    </TooltipContent>
                  </Tooltip>

                  {isActive(item.path) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {configItems.length > 0 && (
          <>
            <div className="mx-3 my-3 border-t border-sidebar-border/40" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 px-3 mb-1">
                Configurações
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {configItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            asChild
                            isActive={isActive(item.path)}
                            className={`
                              relative h-9 rounded-lg transition-all duration-200
                              text-sidebar-foreground/50 hover:text-sidebar-foreground
                              hover:bg-sidebar-accent/60
                              data-[active=true]:bg-primary/12
                              data-[active=true]:text-primary
                              data-[active=true]:font-medium
                            `}
                          >
                            <Link to={item.path} className="flex items-center gap-3 px-3">
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="text-sm">{item.title}</span>
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
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 px-3 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-sidebar-foreground/40 uppercase tracking-wider">Usuário</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="justify-start text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200 h-9 px-3 rounded-lg"
          >
            <Link to="/perfil">
              <UserCircle className="h-4 w-4 mr-2" />
              <span className="text-sm">Meu Perfil</span>
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="justify-start text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200 h-9 px-3 rounded-lg"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="text-sm">Sair</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
