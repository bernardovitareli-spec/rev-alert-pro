import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppErrorBoundary from "@/components/system/AppErrorBoundary";

const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Veiculos = lazy(() => import("./pages/Veiculos"));
const VeiculoDetalhe = lazy(() => import("./pages/VeiculoDetalhe"));
const Importar = lazy(() => import("./pages/Importar"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const ControleEntradaSaida = lazy(() => import("./pages/ControleEntradaSaida"));
const TiposRevisao = lazy(() => import("./pages/TiposRevisao"));
const Empresas = lazy(() => import("./pages/Empresas"));
const Oficinas = lazy(() => import("./pages/Oficinas"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutos
      gcTime: 10 * 60 * 1000,     // 10 minutos
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
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/veiculos" element={<ProtectedRoute><Veiculos /></ProtectedRoute>} />
        <Route path="/veiculos/:id" element={<ProtectedRoute><VeiculoDetalhe /></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
        <Route path="/controle-entrada-saida" element={<ProtectedRoute><ControleEntradaSaida /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
        <Route path="/importar" element={<ProtectedRoute><Importar /></ProtectedRoute>} />
        <Route path="/tipos-revisao" element={<ProtectedRoute><TiposRevisao /></ProtectedRoute>} />
        <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
        <Route path="/oficinas" element={<ProtectedRoute><Oficinas /></ProtectedRoute>} />
        <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsuarios /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);

export default App;
