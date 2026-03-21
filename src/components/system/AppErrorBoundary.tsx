import React from 'react';
import { Button } from '@/components/ui/button';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro de renderização capturado:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm space-y-3 text-center">
            <h1 className="text-xl font-semibold text-foreground">Ops, ocorreu um erro ao carregar a tela</h1>
            <p className="text-sm text-muted-foreground">
              Recarregue a página para continuar.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-muted-foreground/80 break-words">{this.state.errorMessage}</p>
            )}
            <Button onClick={this.handleReload} className="w-full">
              Recarregar sistema
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
