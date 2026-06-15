import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import AppErrorBoundary from "@/components/system/AppErrorBoundary";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { toast } from "sonner";

const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Veiculos = lazy(() => import("./pages/Veiculos"));
const VeiculoDetalhe = lazy(() => import("./pages/VeiculoDetalhe"));
const Importar = lazy(() => import("./pages/Importar"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const RelatoriosOficina = lazy(() => import("./pages/RelatoriosOficina"));
const ControleEntradaSaida = lazy(() => import("./pages/ControleEntradaSaida"));
const TiposRevisao = lazy(() => import("./pages/TiposRevisao"));
const Empresas = lazy(() => import("./pages/Empresas"));
const Oficinas = lazy(() => import("./pages/Oficinas"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));
const AdminExportarOrdens = lazy(() => import("./pages/AdminExportarOrdens"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const MeuPerfil = lazy(() => import("./pages/MeuPerfil"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function FullScreenLoader({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader message="Carregando sessão..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Rotas permitidas ao Apontador (além de /perfil)
const APONTADOR_ALLOWED = [/^\/veiculos(\/.*)?$/, /^\/perfil$/];

function ApontadorGate({ children }: { children: React.ReactNode }) {
  const { isApontador, isLoading } = useUserRole();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isApontador) {
      const allowed = APONTADOR_ALLOWED.some((re) => re.test(location.pathname));
      if (!allowed) {
        toast.error('Acesso restrito ao seu perfil');
      }
    }
  }, [isApontador, isLoading, location.pathname]);

  if (isLoading) return <FullScreenLoader message="Validando acesso..." />;

  if (isApontador) {
    const allowed = APONTADOR_ALLOWED.some((re) => re.test(location.pathname));
    if (!allowed) return <Navigate to="/veiculos" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader message="Validando acesso..." />;
  }

  return (
    <Suspense fallback={<FullScreenLoader message="Carregando..." />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><ApontadorGate><Dashboard /></ApontadorGate></ProtectedRoute>} />
        <Route path="/veiculos" element={<ProtectedRoute><ApontadorGate><Veiculos /></ApontadorGate></ProtectedRoute>} />
        <Route path="/veiculos/:id" element={<ProtectedRoute><ApontadorGate><VeiculoDetalhe /></ApontadorGate></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute><ApontadorGate><Calendario /></ApontadorGate></ProtectedRoute>} />
        <Route path="/controle-entrada-saida" element={<ProtectedRoute><ApontadorGate><ControleEntradaSaida /></ApontadorGate></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><ApontadorGate><Relatorios /></ApontadorGate></ProtectedRoute>} />
        <Route path="/relatorios/oficina" element={<ProtectedRoute><ApontadorGate><RelatoriosOficina /></ApontadorGate></ProtectedRoute>} />
        <Route path="/importar" element={<ProtectedRoute><ApontadorGate><Importar /></ApontadorGate></ProtectedRoute>} />
        <Route path="/tipos-revisao" element={<ProtectedRoute><ApontadorGate><TiposRevisao /></ApontadorGate></ProtectedRoute>} />
        <Route path="/empresas" element={<ProtectedRoute><ApontadorGate><Empresas /></ApontadorGate></ProtectedRoute>} />
        <Route path="/oficinas" element={<ProtectedRoute><ApontadorGate><Oficinas /></ApontadorGate></ProtectedRoute>} />
        <Route path="/admin/usuarios" element={<ProtectedRoute><ApontadorGate><AdminUsuarios /></ApontadorGate></ProtectedRoute>} />
        <Route path="/admin/exportar-ordens" element={<ProtectedRoute><ApontadorGate><AdminExportarOrdens /></ApontadorGate></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><ApontadorGate><Configuracoes /></ApontadorGate></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><MeuPerfil /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppErrorBoundary>
              <AppRoutes />
            </AppErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
