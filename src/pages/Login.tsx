import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Truck, ShieldCheck, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import logoMC from '@/assets/logo-mc-20anos.jpg';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128, 'Senha muito longa'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setIsLoading(true);
    const { error } = await signIn(values.email, values.password);
    setIsLoading(false);

    if (error) {
      const message = error.message?.toLowerCase() ?? '';
      if (message.includes('invalid login credentials')) {
        toast.error('E-mail ou senha inválidos', {
          description: 'Confira os dados digitados ou clique em "Esqueci minha senha" para redefinir.',
        });
        return;
      }
      toast.error('Erro ao entrar', { description: error.message });
    } else {
      // Após login, ApontadorGate em /  redireciona para /veiculos se for apontador
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div
        className="hidden lg:flex lg:w-[42%] flex-col items-center justify-between p-10 relative overflow-hidden border-r border-border/30"
        style={{
          background: 'linear-gradient(155deg, hsl(220 55% 5%), hsl(220 50% 9%), hsl(220 45% 12%))',
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, hsl(160 84% 39%) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, hsl(160 84% 39%) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'hsl(160 84% 39%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-3"
          style={{ background: 'hsl(160 84% 39%)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 w-full max-w-[280px]">
          <img src={logoMC} alt="MC Terraplenagem" className="w-full h-auto object-contain drop-shadow-2xl" />
        </div>

        <div className="relative z-10 text-center space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Gestão de Frota Inteligente</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              Controle completo das revisões, documentos e manutenção da sua frota em um só lugar.
            </p>
          </div>

          <div className="grid gap-3 text-left">
            {[
              { icon: Truck, label: 'Controle de veículos e revisões' },
              { icon: ShieldCheck, label: 'Alertas de documentos vencidos' },
              { icon: BarChart3, label: 'Relatórios e análises em tempo real' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-muted-foreground/50 text-xs">
          © {new Date().getFullYear()} MC Terraplenagem — Todos os direitos reservados
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex justify-center">
            <img src={logoMC} alt="MC Terraplenagem" className="w-48 h-auto object-contain" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">Acesse o sistema de gestão de frota</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                aria-invalid={!!errors.email}
                {...register('email')}
                className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register('password')}
                className="h-11 bg-secondary border-border/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full h-11 font-semibold text-sm rounded-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar no sistema'}
            </Button>
            <div className="text-center pt-1">
              <ForgotPasswordDialog />
            </div>
            <p className="text-center text-xs text-muted-foreground pt-2">
              O acesso é exclusivo a usuários convidados pelo administrador.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
